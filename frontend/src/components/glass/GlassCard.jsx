import React from "react";

export function GlassCard({
  children,
  className = "",
  interactive = false,
  onClick,
  ...props
}) {
  return (
    <div
      className={`glass-card ${interactive ? "interactive" : ""} ${className}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

export default GlassCard;
