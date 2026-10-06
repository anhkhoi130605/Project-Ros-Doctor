import React, { useEffect, useState } from 'react';
import Animate from 'react-smooth';

function getReducedMotionPreference() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SmoothReveal({
  children,
  begin = 0,
  duration = 380,
  distance = 10,
}) {
  const [reduceMotion, setReduceMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setReduceMotion(event.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (reduceMotion) return children;

  return (
    <Animate
      from={{ opacity: 0, transform: `translate3d(0, ${distance}px, 0)` }}
      to={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
      begin={begin}
      duration={duration}
      easing="ease-out"
    >
      {children}
    </Animate>
  );
}
