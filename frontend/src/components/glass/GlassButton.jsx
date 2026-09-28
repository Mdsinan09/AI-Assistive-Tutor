import React from "react";
import { Loader2 } from "lucide-react";

export function GlassButton({
  children,
  className = "",
  variant = "default", // default, primary, danger, ghost
  size = "md", // sm, md, lg
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  type = "button",
  ...props
}) {
  const variantClass = variant === "primary" ? "primary" : variant === "danger" ? "danger" : "";
  const sizeStyles = {
    sm: "padding: 6px 12px; font-size: 0.82rem;",
    md: "padding: 10px 18px; font-size: 0.92rem;",
    lg: "padding: 14px 26px; font-size: 1.05rem;",
  }[size];

  return (
    <button
      type={type}
      className={`glass-btn ${variantClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        opacity: disabled ? 0.55 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
      }}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={18} aria-hidden="true" />
      ) : Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default GlassButton;
