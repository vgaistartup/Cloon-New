/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, XIcon } from './icons';

interface StyleScorePopupProps {
  score: number;
  explanation: string;
  onClose: () => void;
}

const StyleScorePopup: React.FC<StyleScorePopupProps> = ({ score, explanation, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      >
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-gray-100 text-center overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-60" />

            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors p-1"
            >
                <XIcon className="w-5 h-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <SparklesIcon className="w-8 h-8 text-indigo-600" />
                </div>
                
                <h2 className="text-3xl font-serif text-gray-900 mb-1">Style Score</h2>
                <div className="flex items-baseline justify-center gap-1 mb-6">
                    <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">{score}</span>
                    <span className="text-xl text-gray-400 font-medium">/10</span>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-gray-700 leading-relaxed font-medium">
                        "{explanation}"
                    </p>
                </div>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StyleScorePopup;