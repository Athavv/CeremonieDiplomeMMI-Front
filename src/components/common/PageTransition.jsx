import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const transitionRef = useRef(null);
  const blocksRef = useRef([]);
  const logoRef = useRef(null);
  
  // Custom delayed route logic to freeze the page while animating
  const [displayLocation, setDisplayLocation] = useState(location);
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const isAnimating = useRef(false);

  // 15x15 grid of solid blocks. When staggered from the center, 
  // they organically form the jagged, stepped '+' shape seen in the reference!
  const cols = 15;
  const rows = 15;
  const totalBlocks = cols * rows;

  // VERIFICATION: Ne pas faire de transition sur les routes d'administration
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    // Si route admin, on ne fait aucune animation de curtain
    if (isAdminRoute) {
      setDisplayLocation(location);
      setCurrentPath(location.pathname);
      return;
    }

    if (location.pathname !== currentPath) {
      if (isAnimating.current) {
        // If a redirect (e.g., from ProtectedRoute) fires DURING a transition,
        // we must immediately sync the path so React Router doesn't get permanently trapped!
        setCurrentPath(location.pathname);
        setDisplayLocation(location);
        return;
      }
      isAnimating.current = true;

      const tl = gsap.timeline({
        onComplete: () => {
          // PHASE 2: SWITCH ROUTE & REVEAL
          setCurrentPath(location.pathname);
          setDisplayLocation(location);

          const revealTl = gsap.timeline({
             onComplete: () => { isAnimating.current = false; }
          });
          
          // Blocks shrink back down from the OUTSIDE IN
          revealTl.to(blocksRef.current, {
            scale: 0,
            duration: 0.4,
            ease: 'power2.inOut',
            stagger: {
              amount: 0.8,
              grid: [rows, cols],
              from: 'edges' 
            }
          }, 0);
          
          revealTl.to(logoRef.current, { opacity: 0, scale: 0.8, duration: 0.4 }, 0.6);
          revealTl.set(transitionRef.current, { pointerEvents: 'none' });
        }
      });

      // PHASE 1: HIDE CURRENT PAGE
      tl.set(transitionRef.current, { pointerEvents: 'auto' });
      tl.to(logoRef.current, { opacity: 1, scale: 1, duration: 0.3 }, 0); 
      
      // Blocks pop in from CENTER OUT.
      // 1.05 prevents pixel gaps. The solid squares form an expanding + as they appear.
      tl.to(blocksRef.current, {
        scale: 1.05, 
        duration: 0.4,
        ease: 'power2.inOut',
        stagger: {
          amount: 0.8,
          grid: [rows, cols],
          from: 'center'
        }
      }, 0);
    }
  }, [location.pathname, currentPath, location]);

  useLayoutEffect(() => {
    return () => {
      gsap.killTweensOf(blocksRef.current);
      gsap.killTweensOf(logoRef.current);
      gsap.killTweensOf(transitionRef.current);
    };
  }, []);

  const renderChildren = () => {
    if (React.isValidElement(children)) {
      // Adding `key` is CRITICAL here so that deeply nested routes like the 
      // authenticated Gallery remount cleanly instead of breaking into a white screen!
      return React.cloneElement(children, { 
        location: displayLocation,
        key: displayLocation.pathname 
      });
    }
    return children;
  };

  // Si page admin, on retourne directement les enfants natifs sans interférer avec React Router!
  if (isAdminRoute) {
    return (
      <div className="w-full min-h-screen relative z-10">
        {children}
      </div>
    );
  }

  return (
    <>
      <div 
        ref={transitionRef}
        className="fixed inset-0 z-[60] pointer-events-none flex flex-wrap"
      >
        {/* The solid Blue squares that will construct the + shape */}
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <div 
            key={i}
            ref={(el) => (blocksRef.current[i] = el)}
            className="bg-[#071341] origin-center will-change-transform" 
            style={{ 
              width: `${100/cols}%`, 
              height: `${100/rows}%`, 
              transform: 'scale(0)' 
            }}
          ></div>
        ))}
        
        {/* Central Logo (logouge.png) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[70]">
          <img 
            ref={logoRef}
            src="/logouge.png" 
            alt="Logo Gustave Eiffel" 
            className="w-16 h-16 drop-shadow-xl opacity-0" 
          />
        </div>
      </div>
      
      <div className="w-full min-h-screen">
        {renderChildren()}
      </div>
    </>
  );
};

export default PageTransition;







