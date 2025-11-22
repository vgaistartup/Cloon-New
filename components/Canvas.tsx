
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
  onAnalyzeStyle: () => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onSelectPose, 
  poseInstructions, 
  currentPoseIndex, 
  availablePoseKeys, 
  onAnalyzeStyle 
}) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  
  const handlePreviousPose = () => {
    if (isLoading) return;
    const newIndex = (currentPoseIndex - 1 + poseInstructions.length) % poseInstructions.length;
    onSelectPose(newIndex);
  };

  const handleNextPose = () => {
    if (isLoading) return;
    const newIndex = (currentPoseIndex + 1) % poseInstructions.length;
    onSelectPose(newIndex);
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative animate-zoom-in group bg-white">
      {/* Start Over Button */}
      <button 
          onClick={onStartOver}
          className="absolute top-4 left-4 z-30 flex items-center justify-center text-center bg-white border border-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:shadow-md active:scale-95 text-sm shadow-sm"
      >
          <RotateCcwIcon className="w-4 h-4 mr-2" />
          Start Over
      </button>
      
      {/* Style Score Button */}
      {displayImageUrl && (
        <button 
            onClick={onAnalyzeStyle}
            disabled={isLoading}
            className="absolute top-4 right-4 z-30 flex items-center justify-center text-center bg-black text-white font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-gray-900 active:scale-95 text-sm shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <SparklesIcon className="w-4 h-4 mr-2" />
            Style Score
        </button>
      )}

      {/* Image Display or Placeholder */}
      <div className="relative w-full h-full flex items-center justify-center">
        {displayImageUrl ? (
          <img
            key={displayImageUrl} // Use key to force re-render and trigger animation on image change
            src={displayImageUrl}
            alt="Virtual try-on model"
            className="max-w-full max-h-full object-contain transition-opacity duration-500 animate-fade-in"
          />
        ) : (
            <div className="w-[300px] h-[450px] bg-white border border-gray-100 shadow-sm rounded-lg flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-gray-900 mt-4">Loading Model...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <Spinner />
                  {loadingMessage && (
                      <p className="text-lg font-serif text-gray-900 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pose Controls */}
      {displayImageUrl && !isLoading && (
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onMouseEnter={() => setIsPoseMenuOpen(true)}
          onMouseLeave={() => setIsPoseMenuOpen(false)}
        >
          {/* Pose popover menu */}
          <AnimatePresence>
              {isPoseMenuOpen && (
                  <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute bottom-full mb-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 overflow-hidden"
                  >
                      <div className="max-h-60 overflow-y-auto scrollbar-hide">
                        {poseInstructions.map((pose, index) => {
                            const isAvailable = availablePoseKeys.includes(pose);
                            const isCurrent = index === currentPoseIndex;
                            return (
                                <button
                                    key={pose}
                                    onClick={() => onSelectPose(index)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center justify-between transition-colors ${isCurrent ? 'bg-black text-white font-medium' : 'text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100'}`}
                                >
                                    <span className="truncate font-sans">{pose}</span>
                                    {isAvailable && !isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                                </button>
                            )
                        })}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
          
          <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-100 p-1">
            <button 
                onClick={handlePreviousPose}
                className="p-2 rounded-full hover:bg-gray-50 transition-colors"
                disabled={isLoading}
            >
                <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <span className="px-4 text-sm font-medium text-gray-900 whitespace-nowrap max-w-[200px] truncate font-sans">
                {poseInstructions[currentPoseIndex]}
            </span>
            <button 
                onClick={handleNextPose}
                className="p-2 rounded-full hover:bg-gray-50 transition-colors"
                disabled={isLoading}
            >
                <ChevronRightIcon className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
