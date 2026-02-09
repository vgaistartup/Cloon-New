
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate, useTransform } from 'framer-motion';

interface MagnifierProps {
  src: string;
  alt?: string;
  className?: string;
  zoomLevel?: number; // Default 2.5
}

export const Magnifier: React.FC<MagnifierProps> = ({ 
  src, 
  alt = '', 
  className = '', 
  zoomLevel = 2.5 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false); // Flip lens position if near top
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion Values for high-performance updates (60fps)
  // We store the relative X/Y (0 to width/height)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // We also need to track the container dimensions to calculate zoom ratios accurately
  const width = useMotionValue(0);
  const height = useMotionValue(0);

  // Constants
  const LENS_SIZE = 150; 
  const LENS_RADIUS = LENS_SIZE / 2;
  const OFFSET_Y = 80; // Distance from finger

  // Hint Logic: Show on mount, hide after 3s or interaction
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), 800);
    const hideTimer = setTimeout(() => setShowHint(false), 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  const measureContainer = () => {
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          width.set(rect.width);
          height.set(rect.height);
          return rect;
      }
      return null;
  };

  const handleInteractionStart = (clientX: number, clientY: number) => {
    setIsActive(true);
    setShowHint(false);
    const rect = measureContainer();
    if (rect) updatePosition(clientX, clientY, rect);
  };

  const handleInteractionEnd = () => {
    setIsActive(false);
  };

  const updatePosition = (clientX: number, clientY: number, rect: DOMRect) => {
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Smart Positioning: Check if we are in the top 30% of the image
    // If so, flip the lens to be BELOW the finger so it doesn't go off-screen/clip face
    const isTopZone = relY < (rect.height * 0.3);
    if (isTopZone !== isFlipped) {
        setIsFlipped(isTopZone);
    }

    // Update motion values
    x.set(relX);
    y.set(relY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    updatePosition(e.clientX, e.clientY, rect);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    updatePosition(e.touches[0].clientX, e.touches[0].clientY, rect);
  };

  // Dynamic Styles based on MotionValues
  // Lens Position: Follows cursor + Offset
  const lensLeft = useTransform(x, (val) => val - LENS_RADIUS);
  const lensTop = useTransform(y, (val) => isFlipped ? val + OFFSET_Y : val - LENS_RADIUS - OFFSET_Y);

  // Background Position: Inverse movement * Zoom Level to center the target pixel
  // Formula: -1 * (CursorPos * Zoom - LensRadius)
  const bgPosX = useTransform(x, (val) => -1 * (val * zoomLevel - LENS_RADIUS));
  const bgPosY = useTransform(y, (val) => -1 * (val * zoomLevel - LENS_RADIUS));
  const bgPosition = useMotionTemplate`${bgPosX}px ${bgPosY}px`;
  
  const bgSizeX = useTransform(width, (w) => w * zoomLevel);
  const bgSizeY = useTransform(height, (h) => h * zoomLevel);
  const bgSize = useMotionTemplate`${bgSizeX}px ${bgSizeY}px`;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-visible select-none touch-none cursor-crosshair ${className}`}
      onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
      onMouseUp={handleInteractionEnd}
      onMouseLeave={handleInteractionEnd}
      onMouseMove={handleMouseMove}
      onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleInteractionEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Main Image */}
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover pointer-events-none block"
        draggable={false}
      />

      {/* The Stylist Loupe */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute z-50 pointer-events-none"
            style={{
              left: lensLeft,
              top: lensTop,
              width: LENS_SIZE,
              height: LENS_SIZE,
            }}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-4 ring-white bg-white">
              {/* Magnified Image Layer */}
              <motion.div 
                className="absolute top-0 left-0 w-full h-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${src})`,
                  backgroundPosition: bgPosition,
                  backgroundSize: bgSize,
                }}
              />
              
              {/* Visual Polish: Shine & Crosshair */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/10 pointer-events-none" />
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] pointer-events-none" />
              
              {/* Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 opacity-40">
                 <div className="absolute top-1/2 left-0 w-full h-px bg-black/50"></div>
                 <div className="absolute left-1/2 top-0 h-full w-px bg-black/50"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Hint Pill */}
      <AnimatePresence>
        {showHint && !isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-8 left-0 right-0 flex justify-center z-40 pointer-events-none"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full shadow-lg border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] font-semibold text-white tracking-wide uppercase">Hold to Zoom</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
