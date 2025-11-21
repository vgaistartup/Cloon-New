
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized }) => {
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setIsGenerating(true);
        setGeneratedModelUrl(null);
        setError(null);
        try {
            const result = await generateModelImage(file);
            setGeneratedModelUrl(result);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to create model'));
            setUserImageUrl(null);
        } finally {
            setIsGenerating(false);
        }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const reset = () => {
    setUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
  };

  const screenVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full min-h-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 pt-24 pb-12"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
            <div className="max-w-lg space-y-4 lg:space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                Your Look.<br/>Reimagined.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-500 leading-relaxed font-medium max-w-md mx-auto lg:mx-0">
                Upload a photo and let AI create your personal fashion model. Try on any outfit, instantly.
              </p>
              
              <div className="pt-6 lg:pt-8 flex flex-col items-center lg:items-start w-full gap-4">
                <label htmlFor="image-upload-start" className="w-full sm:w-auto relative flex items-center justify-center px-8 py-4 text-base sm:text-lg font-semibold text-white bg-black rounded-full cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10">
                  <UploadCloudIcon className="w-6 h-6 mr-3" />
                  Create My Model
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} />
                <p className="text-gray-400 text-xs sm:text-sm">Works best with a clear, full-body photo.</p>
                {error && <p className="text-red-500 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center mt-8 lg:mt-0">
            <div className="relative rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 bg-white w-full max-w-[280px] sm:max-w-[340px] aspect-[3/4]">
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
          className="w-full min-h-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 px-6 pt-20 pb-12"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-full md:w-1/2 flex-shrink-0 flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-3">
              The New You
            </h1>
            <p className="text-base sm:text-lg text-gray-500 mb-6">
              Review your AI-generated model.
            </p>
            
            {isGenerating && (
              <div className="flex items-center gap-3 text-sm sm:text-base text-gray-900 font-medium bg-white px-6 py-3 rounded-full shadow-lg mb-6">
                <Spinner />
                <span>Designing your model...</span>
              </div>
            )}

            {error && 
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-700 max-w-md mt-4 mb-6">
                <p className="font-bold mb-2">Generation Failed</p>
                <p className="text-sm mb-4 opacity-90">{error}</p>
                <button onClick={reset} className="text-sm font-semibold hover:underline">Try Again</button>
              </div>
            }
            
            <AnimatePresence>
              {generatedModelUrl && !isGenerating && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                >
                  <button 
                    onClick={reset}
                    className="w-full sm:w-auto px-8 py-4 text-sm sm:text-base font-semibold text-gray-900 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-all"
                  >
                    Retake
                  </button>
                  <button 
                    onClick={() => onModelFinalized(generatedModelUrl)}
                    className="w-full sm:w-auto px-8 py-4 text-sm sm:text-base font-semibold text-white bg-black rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-black/20"
                  >
                    Start Styling
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="w-full md:w-1/2 flex items-center justify-center order-1 md:order-2">
            <div 
              className={`relative rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-700 ${isGenerating ? 'ring-4 ring-blue-100' : ''} w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[400px] aspect-[3/4]`}
            >
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl ?? userImageUrl}
                slideMode="drag"
                className="w-full h-full bg-white"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;
