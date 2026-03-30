import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Springs for smooth following
  const cursorX = useSpring(0, { stiffness: 500, damping: 28 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28 });
  
  const outerX = useSpring(0, { stiffness: 150, damping: 15 });
  const outerY = useSpring(0, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const mouseMove = (e) => {
      cursorX.set(e.clientX - 4);
      cursorY.set(e.clientY - 4);
      outerX.set(e.clientX - 20);
      outerY.set(e.clientY - 20);
    };

    window.addEventListener('mousemove', mouseMove);

    return () => {
      window.removeEventListener('mousemove', mouseMove);
    };
  }, [cursorX, cursorY, outerX, outerY]);

  // Hide cursor completely on touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      return null;
  }

  return (
    <>
      {/* The main solid dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-[#B8AB38] rounded-full pointer-events-none z-[9999] hidden md:block"
        style={{ x: cursorX, y: cursorY }}
      />
      
      {/* The trailing outer circle */}
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 border border-[#B8AB38] rounded-full pointer-events-none z-[9998] flex items-center justify-center hidden md:flex"
        style={{ x: outerX, y: outerY }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />
    </>
  );
};

export default CustomCursor;
