import React from 'react';

export default function ProgressCircle({
  percent = 0,
  size = 120,
  strokeWidth = 10,
  color = 'var(--color-moss)',
  trackColor = 'var(--color-line)',
  className = '',
  children,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        role="progressbar"
        aria-valuenow={clampedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress Bar */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {/* Centered Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children || (
          <span className="tabular font-semibold text-lg">
            {clampedPercent.toFixed(clampedPercent % 1 === 0 ? 0 : 1)}%
          </span>
        )}
      </div>
    </div>
  );
}
