"""
Automated Verification Suite for AI Assistive Tutor Landing Page & Routing
"""
import os
import re

def test_design_spec_exists():
    assert os.path.exists("DESIGN.md"), "DESIGN.md must exist in root repository"
    with open("DESIGN.md", "r") as f:
        content = f.read()
    assert "#050608" in content, "DESIGN.md must specify deep black canvas"
    assert "Typography" in content
    assert "Accessibility" in content
    print("PASS: test_design_spec_exists")

def test_landing_page_file_integrity():
    landing_path = "frontend/src/pages/LandingPage.jsx"
    assert os.path.exists(landing_path), f"{landing_path} must exist"
    with open(landing_path, "r") as f:
        code = f.read()
    
    # Check Required Copy & Headings from MASTER PROMPT
    assert "Understand the world." in code, "Hero headline missing"
    assert "One interaction at a time." in code, "Hero headline gradient part missing"
    assert "Intelligence That Makes The World More Accessible" in code or "INTELLIGENCE THAT MAKES THE WORLD MORE ACCESSIBLE".lower() in code.lower()
    assert "See. Read. Ask. Understand." in code, "How it works headline missing"
    assert "Observe. Scan. Ask. Understand." in code, "Connected experience headline missing"
    assert "Technology should open doors, not add barriers." in code, "Accessibility section headline missing"
    assert "A more accessible way to explore, read and learn." in code, "Closing CTA headline missing"
    
    # Check CTA routing targets
    assert 'primaryCtaDestination = token ? "/dashboard" : "/login"' in code, "CTA must route to /login or /dashboard"
    assert "HeroPerceptionScene" in code, "Hero perception sculpture must be integrated"
    print("PASS: test_landing_page_file_integrity")

def test_hero_perception_scene_integrity():
    scene_path = "frontend/src/components/landing/HeroPerceptionScene.jsx"
    assert os.path.exists(scene_path), f"{scene_path} must exist"
    with open(scene_path, "r") as f:
        code = f.read()
    
    assert "canvasRef" in code
    assert "prefers-reduced-motion" in code, "Hero visual must support reduced-motion"
    assert "coreParticles" in code
    assert "orbit1" in code and "orbit2" in code, "Dual orbital rings must be present"
    assert "requestAnimationFrame" in code and "cancelAnimationFrame" in code, "Must clean up RAF"
    print("PASS: test_hero_perception_scene_integrity")

def test_app_routing_configuration():
    app_path = "frontend/src/App.jsx"
    assert os.path.exists(app_path), f"{app_path} must exist"
    with open(app_path, "r") as f:
        code = f.read()
    
    # Ensure LandingPage is at root route /
    assert 'path="/" element={<LandingPage />}' in code, "Root route must be public LandingPage"
    
    # Ensure login route exists at /login
    assert 'path="/login" element={<Login />}' in code, "Existing /login route must be preserved"
    
    # Ensure protected dashboard route exists
    assert 'path="/dashboard"' in code, "Existing /dashboard route must be preserved"
    assert "ProtectedRoute" in code, "ProtectedRoute must wrap dashboard and authenticated pages"
    print("PASS: test_app_routing_configuration")

def test_styles_and_build_artifacts():
    css_path = "frontend/src/styles/landing.css"
    assert os.path.exists(css_path), f"{css_path} must exist"
    with open(css_path, "r") as f:
        css = f.read()
    assert "--lp-bg: #050608;" in css
    assert "prefers-reduced-motion" in css
    print("PASS: test_styles_and_build_artifacts")

if __name__ == "__main__":
    print("\n=== RUNNING LANDING PAGE & ROUTING VERIFICATION SUITE ===")
    test_design_spec_exists()
    test_landing_page_file_integrity()
    test_hero_perception_scene_integrity()
    test_app_routing_configuration()
    test_styles_and_build_artifacts()
    print("=== ALL LANDING PAGE & ROUTING TESTS PASSED SUCCESSFULLY ===\n")
