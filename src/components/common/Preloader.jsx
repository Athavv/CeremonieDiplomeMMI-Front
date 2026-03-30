import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const Preloader = ({ onComplete }) => {
  const containerRef = useRef(null);
  const logoWrapperRef = useRef(null);
  const imageRef = useRef(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (complete) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setComplete(true);
        if (onComplete) onComplete();
      }
    });

    const height = 80; // h-20 = 80px
    const iconWidth = height; 
    
    // Set initial state: wrapper only shows the square icon part on the left
    gsap.set(logoWrapperRef.current, { 
      width: iconWidth,
      height: height,
      rotation: 0
    });

    // 1. Rotate the wrapper (and the icon inside it)
    tl.to(logoWrapperRef.current, {
      rotation: 360,
      duration: 1.2,
      ease: 'power2.inOut'
    });

    // Compute the full target width of the image based on aspect ratio 1014x210
    const fullWidth = height * (1014 / 210);

    // 2. Expand width to reveal the text. 
    // Since the wrapper is in a flex justify-center container, expanding its width naturally keeps it centered
    // which gives the visual effect of the icon sliding left while the text spills out to the right.
    tl.to(logoWrapperRef.current, {
      width: fullWidth,
      duration: 0.8,
      ease: 'power3.inOut'
    });

    // 3. Hold for incredibly short moment
    tl.to({}, { duration: 0.1 });

    // 4. Sweep up to reveal the app faster
    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 0.6,
      ease: 'power4.inOut'
    });

  }, [complete, onComplete]);

  if (complete) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-full bg-[#071341] z-[9999] flex items-center justify-center overflow-hidden"
    >
      {/* Wrapper that will rotate and expand */}
      <div 
        ref={logoWrapperRef}
        className="relative overflow-hidden flex items-center origin-center"
      >
          <img 
            ref={imageRef}
            src="/logogustaveeiffel.png" 
            alt="Logo Gustave Eiffel" 
            className="h-20 w-auto max-w-none origin-left"
            style={{ objectPosition: 'left center', flexShrink: 0 }}
          />
      </div>
    </div>
  );
};

export default Preloader;
