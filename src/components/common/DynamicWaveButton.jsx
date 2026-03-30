import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const DynamicWaveButton = ({ 
  children, 
  className, 
  onClick,
  baseBg = "bg-white",
  hoverBg = "bg-[#B8AB38]",
  baseText = "text-black",
  hoverText = "text-white"
}) => {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useSpring(0, { stiffness: 150, damping: 15, mass: 0.5 });
  const mouseY = useSpring(0, { stiffness: 150, damping: 15, mass: 0.5 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { left, top } = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <>
      {/* Filtre SVG Gooey. Gardé propre et injecté localement. */}
      <svg width="0" height="0" className="absolute hidden pointer-events-none">
        <defs>
          <filter id="gooey-liquid" x="-20%" y="-20%" width="140%" height="140%">
            {/* Optimisation: blur légèrement réduit pour ne pas tuer le GPU */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" 
              result="gooey-liquid" 
            />
            <feComposite in="SourceGraphic" in2="gooey-liquid" operator="atop" />
          </filter>
        </defs>
      </svg>

      <motion.button
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        className={`relative inline-block transition-transform duration-300 border-none outline-none group ${className}`}
        style={{
          boxShadow: 'none', 
          backgroundColor: 'transparent',
          transform: 'translateZ(0)' // Fixe les repaints (optimisation GPU pour le scroll)
        }}
      >
        <div 
          className="absolute inset-0 pointer-events-none" 
          /* 
             CORRECTIF FREEZE SCROLL:
             Le filtre Gooey extrêmement gourmand (calcul matriciel SVG) 
             ne s'active QUE lorsque la souris est DANS le bouton.
             Pendant le scroll de la page (quand on ne le survole pas), 
             le navigateur n'a plus rien à calculer, on retrouve 60 FPS immédiats !
          */
          style={{ 
            filter: isHovered ? "url('#gooey-liquid')" : "none",
            willChange: isHovered ? "filter" : "auto"
          }}
        >
          {/* Forme du fond basique */}
          <div className={`absolute inset-0 ${baseBg} transition-colors duration-300 rounded-[12px]`} 
               style={{ backgroundColor: isHovered ? "" : "" }} 
          />

          {/* 
              La Bulle Liquide (Rond) 
              "Rends le rond plus petit et plus déformé..."
          */}
          <motion.div
            className={`absolute ${isHovered ? hoverBg : baseBg} pointer-events-none`}
            animate={{ 
              // Une rotation continue quand on survole pour donner cet aspect 
              // hyper organique / goutte qui frétille grâce au border-radius asymétrique
              rotate: isHovered ? 180 : 0 
            }}
            transition={{ 
              rotate: { repeat: Infinity, duration: 1.5, ease: "linear" },
              opacity: { duration: 0.2 }, 
              scale: { duration: 0.4, type: "spring" } // petit rebond à l'impact
            }}
            style={{
              width: "55px",  // Plus petit
              height: "55px",
              // Forme de blob asymétrique (très déformé) plutôt qu'un rond parfait
              borderRadius: "45% 65% 55% 45% / 55% 45% 65% 50%", 
              left: mouseX,
              top: mouseY,
              x: "-50%",
              y: "-50%",
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1.6 : 0.2, // Apparaît du néant avec violence
            }}
          />
        </div>

        {/* Le Texte par-dessus */}
        <div className={`relative z-10 pointer-events-none ${baseText} group-hover:${hoverText.replace('text-', '')} transition-colors duration-300 font-bold tracking-widest uppercase`}>
          {children}
        </div>
      </motion.button>
    </>
  );
};

export default DynamicWaveButton;
