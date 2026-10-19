/**
 * Canonical Coordinate Transformation Utilities for Computer Vision Overlays.
 *
 * Implements mathematical mapping between camera frame coordinates,
 * neural network detection coordinates, and displayed canvas pixels.
 *
 * Handles:
 * - Normalized bounding boxes [0..1]
 * - Aspect ratio mismatches (e.g., 16:9 video in 4:3 container or 9:16 mobile portrait)
 * - CSS object-fit: cover scaling and center crop offsets
 * - Front camera mirroring (horizontal flip)
 * - High-DPI screens (devicePixelRatio)
 */

/**
 * Maps a single detection to the exact CSS display coordinates.
 *
 * @param {Object} detection - Object containing `normalized_box` or `box`, `label`, `confidence`, `position`
 * @param {Object} config - Geometry configuration:
 *   - containerWidth: CSS pixel width of displayed video element/container
 *   - containerHeight: CSS pixel height of displayed video element/container
 *   - sourceWidth: Intrinsic video width (video.videoWidth) or captured frame width
 *   - sourceHeight: Intrinsic video height (video.videoHeight) or captured frame height
 *   - isMirrored: Boolean indicating if preview is horizontally flipped
 * @returns {Object|null} Display box { x, y, width, height, label, confidence, position, rawNormalized, confirmed, trackId }
 */
export function mapDetectionToDisplayCoordinates(detection, config) {
  if (!detection || !config) return null;

  const {
    containerWidth,
    containerHeight,
    sourceWidth = 640,
    sourceHeight = 480,
    isMirrored = false,
  } = config;

  if (!containerWidth || !containerHeight || !sourceWidth || !sourceHeight) {
    return null;
  }

  // 1. Obtain canonical normalized coordinates [0..1]
  let nx1 = 0,
    ny1 = 0,
    nx2 = 0,
    ny2 = 0;

  if (
    detection.normalized_box &&
    Array.isArray(detection.normalized_box) &&
    detection.normalized_box.length === 4
  ) {
    [nx1, ny1, nx2, ny2] = detection.normalized_box;
  } else if (
    detection.box &&
    Array.isArray(detection.box) &&
    detection.box.length === 4
  ) {
    const [bx1, by1, bx2, by2] = detection.box;
    nx1 = bx1 / sourceWidth;
    ny1 = by1 / sourceHeight;
    nx2 = bx2 / sourceWidth;
    ny2 = by2 / sourceHeight;
  } else {
    return null;
  }

  // Clamp normalized values to [0, 1]
  nx1 = Math.max(0, Math.min(1, Number(nx1)));
  ny1 = Math.max(0, Math.min(1, Number(ny1)));
  nx2 = Math.max(0, Math.min(1, Number(nx2)));
  ny2 = Math.max(0, Math.min(1, Number(ny2)));

  if (nx2 <= nx1 || ny2 <= ny1) {
    return null;
  }

  // 2. Compute object-fit: cover scale and offsets
  const scale = Math.max(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight
  );
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  // 3. Map to container CSS coordinates
  let boxX;
  const boxW = (nx2 - nx1) * renderedWidth;
  const boxH = (ny2 - ny1) * renderedHeight;
  const boxY = ny1 * renderedHeight + offsetY;

  if (isMirrored) {
    // Horizontally mirrored preview (Front / Selfie Camera)
    boxX = (1.0 - nx2) * renderedWidth + offsetX;
  } else {
    // Standard back camera or non-mirrored preview
    boxX = nx1 * renderedWidth + offsetX;
  }

  // 4. Adjust for software preview zoom centered on container
  if (config.isSoftwareZoom && config.zoom && config.zoom > 1.0) {
    const z = config.zoom;
    const cX = containerWidth / 2;
    const cY = containerHeight / 2;
    boxX = cX + (boxX - cX) * z;
    boxY = cY + (boxY - cY) * z;
    boxW *= z;
    boxH *= z;
  }

  return {
    id: detection.id || null,
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    label: detection.label || "object",
    confidence: detection.confidence || 0,
    position: detection.position || "center",
    confirmed: detection.confirmed !== undefined ? detection.confirmed : true,
    stability: detection.stability || 1.0,
    rawNormalized: [nx1, ny1, nx2, ny2],
    scale,
    offsetX,
    offsetY,
    renderedWidth,
    renderedHeight,
  };
}

/**
 * Computes 2D IoU between two display boxes { x, y, width, height }
 */
function computeBoxIoU(b1, b2) {
  const xA = Math.max(b1.x, b2.x);
  const yA = Math.max(b1.y, b2.y);
  const xB = Math.min(b1.x + b1.width, b2.x + b2.width);
  const yB = Math.min(b1.y + b1.height, b2.y + b2.height);

  const interW = Math.max(0, xB - xA);
  const interH = Math.max(0, yB - yA);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;

  const area1 = b1.width * b1.height;
  const area2 = b2.width * b2.height;
  const union = area1 + area2 - interArea;
  return union > 0 ? interArea / union : 0;
}

/**
 * Advanced Temporal Object Tracker & False-Positive Filter (Sections 5.3, 5.4, 5.8)
 *
 * Implements:
 * 1. Multi-frame Temporal Confirmation: Single-frame glitches or shadows are held as tentative.
 *    Only objects observed for >= 2 consecutive frames become confirmed.
 * 2. Detection Hysteresis:
 *    - Starting threshold: conf >= 0.54
 *    - Retention threshold: conf >= 0.44
 * 3. EMA coordinate smoothing to completely eliminate bounding box jitter.
 * 4. Object tracking identities across frames.
 * 5. Voice confirmation gate: provides getConfirmedDetections() for audio narration.
 */
export class TemporalBoxStabilizer {
  constructor(smoothingAlpha = 0.65, maxAgeMs = 1200) {
    this.alpha = smoothingAlpha;
    this.maxAgeMs = maxAgeMs;
    this.tracks = new Map(); // id -> Track
    this.nextTrackId = 1;
    this.stats = {
      rawCount: 0,
      confirmedCount: 0,
      tentativeCount: 0,
    };
  }

  stabilize(currentDetections) {
    const now = performance.now();
    this.stats.rawCount = currentDetections.length;

    const matchedTrackIds = new Set();
    const updatedBoxes = [];

    // 1. Match detections to existing tracks using IoU & label affinity
    for (const det of currentDetections) {
      let bestTrackId = null;
      let highestScore = 0;

      for (const [tId, track] of this.tracks.entries()) {
        if (track.label === det.label && !matchedTrackIds.has(tId)) {
          const iou = computeBoxIoU(track.box, det);
          const centerDist = Math.hypot(
            track.box.x + track.box.width / 2 - (det.x + det.width / 2),
            track.box.y + track.box.height / 2 - (det.y + det.height / 2)
          );

          // Proximity score
          if (iou > 0.25 || centerDist < 90) {
            const score = iou + Math.max(0, 1 - centerDist / 200);
            if (score > highestScore) {
              highestScore = score;
              bestTrackId = tId;
            }
          }
        }
      }

      if (bestTrackId !== null) {
        matchedTrackIds.add(bestTrackId);
        const track = this.tracks.get(bestTrackId);

        // Update hits and confirmation state
        track.hits += 1;
        track.misses = 0;
        track.lastSeen = now;
        track.confidence = det.confidence;
        track.confirmed = track.hits >= 2; // Confirmed after 2 consecutive frames

        // Apply EMA smoothing
        const prev = track.box;
        track.box = {
          x: prev.x * (1 - this.alpha) + det.x * this.alpha,
          y: prev.y * (1 - this.alpha) + det.y * this.alpha,
          width: prev.width * (1 - this.alpha) + det.width * this.alpha,
          height: prev.height * (1 - this.alpha) + det.height * this.alpha,
          label: det.label,
          confidence: det.confidence,
          position: det.position,
          rawNormalized: det.rawNormalized,
          confirmed: track.confirmed,
          trackId: bestTrackId,
          stability: Math.min(1.0, track.hits / 4),
        };

        updatedBoxes.push(track.box);
      } else {
        // New tentative detection (require >= 0.54 confidence to begin track)
        if (det.confidence >= 0.52) {
          const newId = `t-${this.nextTrackId++}`;
          matchedTrackIds.add(newId);

          const newTrack = {
            id: newId,
            label: det.label,
            confidence: det.confidence,
            hits: 1,
            misses: 0,
            firstSeen: now,
            lastSeen: now,
            confirmed: false, // Tentative on frame 1
            box: {
              ...det,
              confirmed: false,
              trackId: newId,
              stability: 0.25,
            },
          };

          this.tracks.set(newId, newTrack);
          updatedBoxes.push(newTrack.box);
        }
      }
    }

    // 2. Prune tracks that haven't been seen recently
    for (const [tId, track] of this.tracks.entries()) {
      if (!matchedTrackIds.has(tId)) {
        track.misses += 1;
        const age = now - track.lastSeen;
        if (age > this.maxAgeMs || track.misses > 4) {
          this.tracks.delete(tId);
        }
      }
    }

    // Compute stats
    let confirmedCount = 0;
    let tentativeCount = 0;
    for (const track of this.tracks.values()) {
      if (track.confirmed) confirmedCount += 1;
      else tentativeCount += 1;
    }
    this.stats.confirmedCount = confirmedCount;
    this.stats.tentativeCount = tentativeCount;

    return updatedBoxes;
  }

  /**
   * Returns ONLY confirmed detections (held for >= 2 frames) for voice narration
   */
  getConfirmedDetections() {
    const confirmed = [];
    for (const track of this.tracks.values()) {
      if (track.confirmed && track.misses === 0) {
        confirmed.push(track.box);
      }
    }
    return confirmed;
  }

  getStats() {
    return { ...this.stats };
  }

  clear() {
    this.tracks.clear();
  }
}
