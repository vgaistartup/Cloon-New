
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { WardrobeItem } from '../types';
import { UploadCloudIcon, Trash2Icon, FilterIcon, CheckCircleIcon, XIcon, SparklesIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from './Spinner';

interface WardrobeViewProps {
    wardrobe: WardrobeItem[];
    onProductSelect: (item: WardrobeItem) => void;
    onUpload?: (file: File) => void;
    onDeleteItems?: (itemIds: string[]) => void;
    onClose?: () => void;
    generationProgress?: number;
    queueCount?: number;
    onTryOn?: (item: WardrobeItem) => void;
}

const WardrobeView: React.FC<WardrobeViewProps> = ({ wardrobe, onProductSelect, onUpload, onDeleteItems, onClose, generationProgress = 0, queueCount = 0, onTryOn }) => {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && onUpload) {
            onUpload(e.target.files[0]);
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleItemClick = (item: WardrobeItem) => {
        if (item.isAnalyzing) return; // Prevent interaction while analyzing
        if (isSelectionMode) {
            toggleSelection(item.id);
        } else {
            onProductSelect(item);
        }
    };
    
    const handleTrashClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling
        console.log("Trash clicked. Mode:", isSelectionMode, "Selected:", selectedIds.size);

        if (wardrobe.length === 0) return;

        if (!isSelectionMode) {
            // Enter selection mode
            setIsSelectionMode(true);
            setSelectedIds(new Set());
        } else {
            // If already in selection mode
            if (selectedIds.size > 0) {
                if (onDeleteItems) {
                    // Removed blocking confirm dialog
                    console.log("Executing delete for:", Array.from(selectedIds));
                    onDeleteItems(Array.from(selectedIds));
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                } else {
                    console.error("onDeleteItems prop is missing");
                }
            } else {
                // If nothing selected, just exit selection mode
                console.log("Exiting selection mode (no items selected)");
                setIsSelectionMode(false);
            }
        }
    };

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    };

    const radius = 9;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (generationProgress / 100) * circumference;

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Custom Wardrobe Header */}
            <header className="sticky top-0 z-30 w-full h-[60px] px-4 bg-white/95 backdrop-blur-xl border-b border-border flex items-center justify-between shrink-0 transition-all">
                {isSelectionMode ? (
                    <button onClick={cancelSelection} className="text-sm font-medium text-text-secondary hover:text-black transition-colors w-16 text-left">
                        Cancel
                    </button>
                ) : (
                     <div className="w-16 flex items-center">
                        {onClose && (
                            <button 
                                onClick={onClose} 
                                className="p-2 -ml-2 rounded-full text-text-primary hover:bg-surface-subtle transition-colors"
                                aria-label="Close"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        )}
                     </div>
                )}
                
                <h1 className="text-lg font-bold text-text-primary tracking-tight text-center flex-1">
                    My Wardrobe
                </h1>
                
                {/* Fixed width constraint removed to prevent button covering/squashing */}
                <div className="flex items-center gap-2 justify-end w-auto min-w-[64px]">
                        {queueCount > 0 && (
                            <div className="flex items-center justify-center p-1 pointer-events-none">
                                 <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 24 24">
                                    <circle className="text-surface-subtle" strokeWidth="3" stroke="currentColor" fill="transparent" r={radius} cx="12" cy="12" />
                                    <circle className="text-black transition-all duration-300 ease-in-out" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="12" cy="12" />
                                    <text 
                                        x="12" 
                                        y="12" 
                                        className="text-[9px] font-bold fill-current text-black" 
                                        textAnchor="middle" 
                                        dominantBaseline="central"
                                        transform="rotate(90 12 12)" 
                                    >
                                        {queueCount}
                                    </text>
                                </svg>
                            </div>
                        )}
                        <button 
                            onClick={handleTrashClick}
                            className={`p-2 rounded-full transition-colors relative z-10 ${isSelectionMode && selectedIds.size > 0 ? 'text-red-600 bg-red-50' : 'text-text-primary hover:bg-surface-subtle'} ${wardrobe.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            <Trash2Icon className="w-5 h-5" />
                        </button>
                </div>
            </header>

            <div className="p-6 pb-24 w-full overflow-y-auto scrollbar-hide flex-grow">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8 max-w-2xl mx-auto">
                    {/* Upload Placeholder (Hidden in Selection Mode) */}
                    {!isSelectionMode && (
                        <div className="flex flex-col gap-3">
                            <label className="aspect-[3/4] border border-dashed border-border rounded-card flex flex-col items-center justify-center text-text-secondary hover:border-text-primary hover:text-text-primary transition-all cursor-pointer bg-white group shadow-none hover:shadow-soft">
                                <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center mb-2 transition-transform group-hover:scale-110">
                                    <UploadCloudIcon className="w-5 h-5 text-text-secondary group-hover:text-text-primary"/>
                                </div>
                                <span className="text-sm font-semibold">Add Item</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    )}

                    {wardrobe.map((item) => {
                        const isSelected = selectedIds.has(item.id);
                        return (
                            <div 
                                key={item.id} 
                                className={`flex flex-col gap-3 group cursor-pointer relative ${item.isAnalyzing ? 'opacity-90' : ''}`}
                                onClick={() => handleItemClick(item)}
                            >
                                <div className={`group relative aspect-[3/4] bg-white rounded-card overflow-hidden border shadow-soft transition-all duration-300 ${isSelected ? 'border-black ring-1 ring-black' : 'border-border hover:shadow-elevated'}`}>
                                    <img 
                                        src={item.url} 
                                        alt={item.name} 
                                        className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-95' : 'group-hover:scale-105'}`} 
                                    />
                                    
                                    {/* Analysis Spinner Overlay */}
                                    {item.isAnalyzing && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-30">
                                            <div className="scale-75">
                                                <Spinner />
                                            </div>
                                            <span className="text-[10px] font-semibold text-text-secondary mt-2 tracking-wide">Analyzing...</span>
                                        </div>
                                    )}
                                    
                                    {/* Try On Button Overlay (Hidden if analyzing) */}
                                    {!isSelectionMode && onTryOn && !item.isAnalyzing && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTryOn(item);
                                            }}
                                            className="absolute bottom-2 right-2 p-2.5 bg-white/90 backdrop-blur-sm text-black rounded-full shadow-md border border-white/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-105 hover:bg-white z-20"
                                            aria-label="Try On"
                                            title="Try On"
                                        >
                                            <SparklesIcon className="w-4 h-4" />
                                        </button>
                                    )}

                                    {/* Selection Overlay */}
                                    <AnimatePresence>
                                        {isSelectionMode && !item.isAnalyzing && (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`absolute inset-0 z-10 transition-colors ${isSelected ? 'bg-black/10' : 'bg-transparent'}`}
                                            >
                                                <div className="absolute top-3 right-3">
                                                    {isSelected ? (
                                                        <div className="bg-black text-white rounded-full p-0.5">
                                                            <CheckCircleIcon className="w-5 h-5 fill-black stroke-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border-2 border-white/80 bg-black/20 backdrop-blur-sm shadow-sm"></div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <p className={`text-sm font-medium px-1 truncate transition-colors ${isSelected ? 'text-black font-bold' : 'text-text-primary'}`}>
                                    {item.name}
                                </p>
                            </div>
                        );
                    })}
                </div>
                
                {wardrobe.length === 0 && !isSelectionMode && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <p className="text-sm font-medium">Your wardrobe is empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WardrobeView;
