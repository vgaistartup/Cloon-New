
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage, analyzeUserIdentity } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized }) => {
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'analyzing' | 'generating'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const currentFileRef = useRef<File | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }
    
    // Reset state
    currentFileRef.current = file;
    setGeneratedModelUrl(null);
    setError(null);
    setLoadingState('analyzing');

    // Local Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        if (currentFileRef.current === file) {
            setUserImageUrl(e.target?.result as string);
        }
    };
    reader.readAsDataURL(file);

    try {
        // Step 1: Deep Analysis (Flash Vision)
        const analysis = await analyzeUserIdentity(file);
        
        if (currentFileRef.current !== file) return; // Cancelled
        
        // Step 2: Generation (Pro/Flash with Analysis Data)
        setLoadingState('generating');
        const url = await generateModelImage(file, analysis);
        
        if (currentFileRef.current !== file) return; // Cancelled
        
        setGeneratedModelUrl(url);
        setLoadingState('idle');
    } catch (err) {
        if (currentFileRef.current !== file) return;
        
        console.error("Generation failed", err);
        setLoadingState('idle');
        setError(getFriendlyErrorMessage(err, 'Failed to create model'));
    }
        
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const reset = () => {
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setLoadingState('idle');
    setError(null);
    currentFileRef.current = null;
  };

  const screenVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const isLoading = loadingState !== 'idle';

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="flex-1 flex flex-col items-center justify-center h-full w-full max-w-md mx-auto px-6 gap-8"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="text-center space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1] font-display">
                Your Look.<br/>Reimagined.
              </h1>
              <p className="text-base text-text-secondary leading-relaxed font-normal max-w-xs mx-auto">
                Upload a photo and let AI create your personal fashion model.
              </p>
            </div>
              
            <div className="w-full flex flex-col items-center gap-5">
                <label htmlFor="image-upload-start" className="w-full relative flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-black rounded-btn cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all shadow-elevated">
                  <UploadCloudIcon className="w-5 h-5 mr-2" />
                  Create My Model
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} />
                
                <p className="text-text-secondary text-xs">Works best with a clear, full-body photo.</p>
                
                {error && <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-100 px-4 py-3 rounded-btn shadow-soft">{error}</p>}
                
                {/* Compact Preview Card - Adjusted to be strictly responsive */}
                <div className="relative w-full max-h-[40vh] aspect-[3/4] max-w-[260px] rounded-[28px] overflow-hidden bg-white mt-2">
                    <Compare
                    firstImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon.jpg"
                    secondImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon-model.png"
                    slideMode="drag"
                    className="w-full h-full bg-white"
                    />
                </div>
            </div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="flex-1 flex flex-col w-full max-w-md mx-auto px-6 pb-4 h-full"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex-shrink-0 flex flex-col items-center text-center pt-4 pb-6 z-10">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2 font-display">
              The New You
            </h1>
            <p className="text-sm text-text-secondary">
              Review your AI-generated model.
            </p>
            
            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-text-primary font-medium bg-white px-6 py-3 rounded-full shadow-soft mt-6 border border-border animate-pulse">
                <Spinner />
                <span>
                    {loadingState === 'analyzing' ? 'Scanning facial physics...' : 'Designing your model...'}
                </span>
              </div>
            )}

            {error && 
              <div className="bg-red-50 p-4 rounded-card border border-red-100 text-red-700 max-w-sm mt-4 shadow-soft">
                <p className="font-bold mb-1 text-sm">Generation Failed</p>
                <p className="text-xs mb-2 opacity-90">{error}</p>
                <button onClick={reset} className="text-xs font-semibold hover:underline">Try Again</button>
              </div>
            }
            
            <AnimatePresence>
              {generatedModelUrl && !isLoading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-row items-center gap-3 w-full justify-center mt-6"
                >
                  <button 
                    onClick={reset}
                    className="px-6 py-3.5 text-sm font-semibold text-text-primary bg-white border border-border rounded-btn hover:bg-surface-subtle transition-all"
                  >
                    Retake
                  </button>
                  <button 
                    onClick={() => onModelFinalized(generatedModelUrl)}
                    className="px-8 py-3.5 text-sm font-semibold text-white bg-black rounded-btn hover:scale-[1.01] active:scale-[0.99] transition-all shadow-elevated"
                  >
                    Start Styling
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex-1 relative w-full flex items-center justify-center min-h-0">
            <div 
              className={`relative rounded-[28px] overflow-hidden transition-all duration-700 ${isLoading ? 'ring-4 ring-black/5' : ''} h-full w-auto aspect-[3/4] max-w-full object-contain bg-white`}
            >
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl ?? userImageUrl}
                slideMode="drag"
                className="w-full h-full bg-white"
                secondImageClassname="brightness-[1.05] contrast-[1.02]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;
