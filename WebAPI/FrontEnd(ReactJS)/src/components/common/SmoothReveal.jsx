import React, { useEffect, useState } from 'react';
import './SmoothReveal.css';

function getReducedMotionPreference() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SmoothReveal({
  children,
  begin = 0,
  duration = 380,
  distance = 10,
  className = '',
  style = {},
}) {
  const [reduceMotion, setReduceMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setReduceMotion(event.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (reduceMotion) {
    return <>{children}</>;
  }

  const combinedStyle = {
    animationDuration: `${duration}ms`,
    animationDelay: `${begin}ms`,
    '--smooth-reveal-distance': `${distance}px`,
    ...style,
  };

  return (
    <div className={`smooth-reveal ${className}`.trim()} style={combinedStyle}>
      {children}
    </div>
  );
}
