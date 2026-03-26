import React from "react";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  return (
    <div
      className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      {/* Outer Ring - Guardas (Blue) */}
      <motion.div
        className="absolute w-full h-full rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner Ring - Gangsters (Orange) */}
      <motion.div
        className="absolute w-[70%] h-[70%] rounded-full border-2 border-transparent border-b-orange-500 border-l-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />

      {/* Center Dot / Pulse */}
      <motion.div
        className="absolute w-[25%] h-[25%] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default LoadingSpinner;
