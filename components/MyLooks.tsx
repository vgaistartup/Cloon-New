
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import StartScreen from './StartScreen';
import { DotsVerticalIcon, FilterIcon, RotateCcwIcon, CheckCircleIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Look } from '../types';

interface MyLooksProps {
    looks: Look[];
    modelImageUrl: string | null;
    onModelFinalized: (url: string) => void;
    onResetModel: () => void;
}

type SortOrder = 'newest' | 'oldest';

const MyLooks: React.FC<MyLooksProps> = ({ looks, modelImageUrl, onModelFinalized, onResetModel }) => {
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    const [hiddenLookIds, setHiddenLookIds] = useState<string[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const activeLooks = useMemo(() => {
        return looks.filter(look => !hiddenLookIds.includes(look.id));
    }, [looks, hiddenLookIds]);

    const sortedLooks = useMemo(() => {
        const looksCopy = [...activeLooks];
        if (sortOrder === 'oldest') {
            return looksCopy.reverse();
        }
        return looksCopy;
    }, [activeLooks, sortOrder]);

    if (!modelImageUrl) {
        // Allow scrolling for the start screen content
        return (
            <div className="h-full w-full overflow-y-auto bg-[#F5F5F7] scrollbar-hide">
                 <StartScreen onModelFinalized={onModelFinalized} />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-[#F5F5F7] overflow-hidden flex flex-col">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-30">
                <div className="w-10"></div>

                <div className="flex items-center gap-2">
                    <h1 className="text-[17px] font-semibold text-[#1D1D1F] tracking-tight">My Collection</h1>
                    <span className="flex items-center justify-center px-2 py-0.5 bg-black/5 text-gray-500 text-[11px] font-bold rounded-full">
                        {activeLooks.length}
                    </span>
                </div>

                <div className="flex items-center gap-2 w-10 justify-end">
                     <div className="relative">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md hover:bg-white transition-all shadow-sm"
                        >
                            <FilterIcon className="w-4 h-4 text-[#1D1D1F]" />
                        </button>
                        <AnimatePresence>
                            {isFilterOpen && (
                                <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-40 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 z-40 overflow-hidden p-1.5"
                                >
                                    <button 
                                        onClick={() => { setSortOrder('newest'); setIsFilterOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center justify-between transition-colors ${sortOrder === 'newest' ? 'bg-gray-50 text-black font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Newest
                                        {sortOrder === 'newest' && <CheckCircleIcon className="w-3.5 h-3.5 text-black"/>}
                                    </button>
                                    <button 
                                        onClick={() => { setSortOrder('oldest'); setIsFilterOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[13px] flex items-center justify-between transition-colors ${sortOrder === 'oldest' ? 'bg-gray-50 text-black font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Oldest
                                        {sortOrder === 'oldest' && <CheckCircleIcon className="w-3.5 h-3.5 text-black"/>}
                                    </button>
                                </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md hover:bg-white transition-all shadow-sm"
                        >
                            <DotsVerticalIcon className="w-4 h-4 text-[#1D1D1F]" />
                        </button>
                        <AnimatePresence>
                             {isMenuOpen && (
                                <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 z-40 overflow-hidden p-1.5"
                                >
                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            onResetModel();
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors"
                                    >
                                        <RotateCcwIcon className="w-4 h-4" />
                                        Reset Avatar
                                    </button>
                                </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Main Content - Horizontal Swipe */}
            <div className="flex-grow w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide flex items-stretch bg-[#F5F5F7]">
                {sortedLooks.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center text-gray-400 gap-4 px-8 text-center animate-fade-in">
                        <p className="text-2xl font-bold text-gray-900">Empty Collection</p>
                        <p className="text-base text-gray-500">Your style journey starts in the Wardrobe.</p>
                    </div>
                ) : (
                    sortedLooks.map((look) => (
                        <div key={look.id} className="flex-shrink-0 w-full h-full snap-center flex flex-col items-center justify-center relative">
                            
                            {/* Image taking full space seamlessly */}
                            <div className="absolute inset-0 flex items-center justify-center pb-0 pt-0">
                                <img 
                                    src={look.url} 
                                    alt="Look" 
                                    className="max-h-full w-full object-cover animate-zoom-in"
                                    draggable={false}
                                />
                            </div>

                            {/* Minimal Info Overlay at bottom - Glassmorphism */}
                            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/30 backdrop-blur-md rounded-full border border-white/20 shadow-lg flex items-center gap-3 z-10 max-w-[90%]">
                                <div className="flex flex-col items-center">
                                     <h3 className="text-sm font-semibold text-[#1D1D1F] whitespace-nowrap truncate max-w-[200px]">
                                        {look.items.length > 0 ? look.items[0] : 'New Look'}
                                        {look.items.length > 1 && <span className="text-gray-500 font-normal"> + {look.items.length - 1} more</span>}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MyLooks;
