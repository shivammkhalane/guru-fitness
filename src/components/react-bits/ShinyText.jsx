import React from 'react';

export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = '',
  children
}) {
  const content = text || children;
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${disabled ? 'text-zinc-200' : 'animate-shine'} ${className}`}
      style={{
        backgroundImage: 'linear-gradient(110deg, #9ca3af 35%, #ffffff 50%, #9ca3af 65%)',
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        animationDuration,
      }}
    >
      {content}
    </span>
  );
}
