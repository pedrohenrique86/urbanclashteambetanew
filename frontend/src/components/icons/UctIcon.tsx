import React from 'react';

interface UctIconProps {
  className?: string;
}

const UctIcon: React.FC<UctIconProps> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 120 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Urban Clash Team Icon"
    >
      <defs>
        <linearGradient id="gradU" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#ea580c', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="gradC" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="gradT" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#9ca3af', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#4b5563', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <text
        fontFamily="Orbitron, sans-serif"
        fontSize="38"
        fontWeight="bold"
        fill="url(#gradU)"
        x="0"
        y="35"
      >
        U
      </text>
      <text
        fontFamily="Orbitron, sans-serif"
        fontSize="38"
        fontWeight="bold"
        fill="url(#gradC)"
        x="38"
        y="35"
      >
        C
      </text>
      <text
        fontFamily="Orbitron, sans-serif"
        fontSize="38"
        fontWeight="bold"
        fill="url(#gradT)"
        x="78"
        y="35"
      >
        T
      </text>
    </svg>
  );
};

export default UctIcon;