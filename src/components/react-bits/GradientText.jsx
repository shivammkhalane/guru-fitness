import React from 'react';

export default function GradientText({
  children,
  className = '',
  colors = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888', '#f09433'],
  animationSpeed = 4,
  showBorder = false,
  ...props
}) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    backgroundSize: '300% 100%',
    animationDuration: `${animationSpeed}s`,
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl transition-all ${className}`}
      {...props}
    >
      {showBorder && (
        <div
          className="pointer-events-none absolute inset-0 animate-shine"
          style={gradientStyle}
        >
          <div className="absolute inset-[1.5px] rounded-[inherit] bg-zinc-950" />
        </div>
      )}
      <div
        className="relative z-10 inline-block bg-clip-text text-transparent animate-shine"
        style={gradientStyle}
      >
        {children}
      </div>
    </div>
  );
}
