
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect } from 'react';
import StartScreen from './StartScreen';
import { DotsVerticalIcon, RotateCcwIcon, ShareIcon, Trash2Icon, PlusIcon, UserIcon, SparklesIcon, SkeletonFrontIcon, SkeletonThreeQuarterIcon, SkeletonSideIcon, SkeletonWalkIcon, SkeletonActionIcon, SkeletonLeanIcon, XIcon, ChevronDownIcon } from './icons';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Look } from '../types';
import { Product } from '../data/products';
import { VIBE_OPTIONS } from '../data/vibes';

interface MyLooksProps {
    looks: Look[];
    products: Product[];
    modelImageUrl: string | null;
    onModelFinalized: (url: string) => void;
    onCreateNewAvatar: () => void;
    onDeleteLook: (id: string) => void;
    onProductSelect: (product: Product) => void;
    initialLookId?: string | null;
    onResetInitialLookId?: () => void;
    onRemix: () => void;
    onPoseSelect?: (lookId: string, config: { pose?: string, vibe?: string }) => void;
    generationProgress: number;
    queueCount?: number;
    onClose: () => void;
}

type SortOrder = 'newest' | 'oldest';
type SheetMode = 'products' | 'edit';
type EditTab = 'body' | 'vibe';

const POSE_OPTIONS = [
    { label: 'Frontal', instruction: 'Full frontal view, hands on hips', icon: SkeletonFrontIcon },
    { label: '3/4 Turn', instruction: 'Slightly turned, 3/4 view', icon: SkeletonThreeQuarterIcon },
    { label: 'Side View', instruction: 'Side profile view', icon: SkeletonSideIcon },
    { label: 'Walking', instruction: 'Walking towards camera, dynamic motion', icon: SkeletonWalkIcon },
    { label: 'Action', instruction: 'Jumping in the air, mid-action shot', icon: SkeletonActionIcon },
    { label: 'Leaning', instruction: 'Leaning against a wall, casual', icon: SkeletonLeanIcon },
];

const MyLooks: React.FC<MyLooksProps> = ({ looks, products, modelImageUrl, onModelFinalized, onCreateNewAvatar, onDeleteLook, onProductSelect, initialLookId, onResetInitialLookId, onRemix, onPoseSelect, generationProgress, queueCount = 0, onClose }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Bottom Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<SheetMode>('products');
    const [editTab, setEditTab] = useState<EditTab>('body');
    
    // Selected Vibe State (Ephemeral for UI, logic handles actual update)
    const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);

    // Look Counter Auto-Hide State
    const [isCountVisible, setIsCountVisible] = useState(false);
    const countTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const sortedLooks = useMemo(() => {
        // Default to newest first
        return [...looks];
    }, [looks]);

    // Handle initial look selection (deep linking from Home or Try-On)
    useEffect(() => {
        if (initialLookId && sortedLooks.length > 0 && scrollRef.current) {
            const index = sortedLooks.findIndex(l => l.id === initialLookId);
            if (index !== -1) {
                // Small timeout ensures DOM layout is stable before scrolling
                setTimeout(() => {
                    if (scrollRef.current) {
                        const width = scrollRef.current.clientWidth;
                        scrollRef.current.scrollTo({ left: index * width, behavior: 'auto' });
                        setActiveIndex(index);
                        
                        // Clear the ID so we don't keep jumping back if the user scrolls away and returns
                        if (onResetInitialLookId) {
                            onResetInitialLookId();
                        }
                    }
                }, 100);
            }
        }
    }, [initialLookId, sortedLooks, onResetInitialLookId]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const scrollLeft = scrollRef.current.scrollLeft;
            const width = scrollRef.current.clientWidth;
            const index = Math.round(scrollLeft / width);
            setActiveIndex(index);
        }
    };

    // Auto-hide look counter on swipe
    useEffect(() => {
        setIsCountVisible(true);
        if (countTimerRef.current) clearTimeout(countTimerRef.current);
        
        countTimerRef.current = setTimeout(() => {
            setIsCountVisible(false);
        }, 2000);

        return () => {
            if (countTimerRef.current) clearTimeout(countTimerRef.current);
        };
    }, [activeIndex]);

    // Reset active index if looks change significantly (e.g. deletion)
    useEffect(() => {
        if (activeIndex >= sortedLooks.length && sortedLooks.length > 0) {
            setActiveIndex(sortedLooks.length - 1);
        }
    }, [sortedLooks.length, activeIndex]);

    // Reset sheet mode when changing looks
    useEffect(() => {
        setSheetMode('products');
        setEditTab('body');
        setSelectedVibeId(null);
    }, [activeIndex]);

    const currentLookItems = useMemo(() => {
        if (!sortedLooks[activeIndex]) return [];
        return sortedLooks[activeIndex].garments.map(garment => {
            const product = products.find(p => p.id === garment.id);
            return product || garment;
        });
    }, [sortedLooks, activeIndex, products]);
    
    const handleShareLook = async () => {
        const currentLook = sortedLooks[activeIndex];
        if (!currentLook) return;
        
        setIsMenuOpen(false);

        try {
            if (currentLook.url.startsWith('data:')) {
                // It's a base64 image (generated). Convert to File for sharing.
                const response = await fetch(currentLook.url);
                const blob = await response.blob();
                const file = new File([blob], `cloon-look-${currentLook.id}.png`, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'My Look on Cloon',
                        text: 'Check out this outfit I created with AI!',
                    });
                } else {
                    // Fallback: Download if file sharing isn't supported
                    const link = document.createElement('a');
                    link.href = currentLook.url;
                    link.download = `cloon-look-${currentLook.id}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    alert("Image saved to your device!");
                }
            } else {
                // Regular URL (hosted image)
                if (navigator.share) {
                    await navigator.share({
                        title: 'My Look on Cloon',
                        text: 'Check out this outfit I created with AI!',
                        url: currentLook.url
                    });
                } else {
                    await navigator.clipboard.writeText(currentLook.url);
                    alert("Look URL copied to clipboard!");
                }
            }
        } catch (err) {
            console.error('Error sharing:', err);
            // Last resort fallback
            if (!currentLook.url.startsWith('data:')) {
                try {
                    await navigator.clipboard.writeText(currentLook.url);
                    alert("Look URL copied to clipboard!");
                } catch (e) {}
            } else {
                 alert("Unable to share image. Try taking a screenshot!");
            }
        }
    };
    
    const handleDeleteCurrentLook = () => {
        setIsMenuOpen(false);
        const currentLook = sortedLooks[activeIndex];
        if (currentLook) {
            // Removed blocking confirm dialog
            onDeleteLook(currentLook.id);
            if (activeIndex > 0) {
                setActiveIndex(prev => prev - 1);
            }
        }
    };
    
    const handlePoseClick = (instruction: string) => {
        const currentLook = sortedLooks[activeIndex];
        if (currentLook && onPoseSelect) {
            onPoseSelect(currentLook.id, { pose: instruction });
            // Close the sheet automatically
            setIsSheetOpen(false);
            // Reset UI state to default for next open
            setSheetMode('products');
        }
    };

    const handleVibeClick = (vibeId: string, prompt: string) => {
        const currentLook = sortedLooks[activeIndex];
        setSelectedVibeId(vibeId);
        if (currentLook && onPoseSelect) {
            onPoseSelect(currentLook.id, { vibe: prompt });
            // Close the sheet automatically
            setIsSheetOpen(false);
            setSheetMode('products');
        }
    };

    const isBaseModel = useMemo(() => {
        const currentLook = sortedLooks[activeIndex];
        if (!currentLook) return false;
        return currentLook.id.startsWith('model-base-') || currentLook.id.startsWith('temp-base-');
    }, [sortedLooks, activeIndex]);

    const radius = 9;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (generationProgress / 100) * circumference;

    if (!modelImageUrl) {
        return (
            <div className="h-full w-full bg-white flex flex-col relative">
                 <button 
                    onClick={onClose} 
                    className="absolute top-4 left-4 z-[60] p-2 rounded-full hover:bg-surface-subtle transition-colors"
                 >
                    <XIcon className="w-6 h-6 text-text-primary" />
                 </button>
                 <div className="px-6 pt-4 pb-2"></div>
                 <StartScreen onModelFinalized={onModelFinalized} />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="relative w-full h-[60px] min-h-[60px] px-4 flex items-center justify-between z-20 shrink-0 bg-white/95 backdrop-blur-xl border-b border-border">
                 {/* Left Actions */}
                 <div className="w-16 flex items-center">
                    <button 
                        onClick={onClose} 
                        className="p-2 -ml-2 rounded-full text-text-primary hover:bg-surface-subtle transition-colors"
                        aria-label="Close"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                 </div>

                 {/* Absolute Center Title */}
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                    <h1 className="text-lg font-bold text-text-primary tracking-tight">My Looks</h1>
                 </div>

                 {/* Right Actions */}
                 <div className="flex items-center justify-end gap-2 min-w-[40px]">
                    {queueCount > 0 && (
                        <div className="flex items-center justify-center">
                             <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 24 24">
                                {/* Track */}
                                <circle
                                    className="text-surface-subtle"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx="12"
                                    cy="12"
                                />
                                {/* Progress */}
                                <circle
                                    className="text-black transition-all duration-300 ease-in-out"
                                    strokeWidth="3"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx="12"
                                    cy="12"
                                />
                                {/* Queue Count */}
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
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-10 h-10 flex items-center justify-end text-text-primary"
                    >
                        <DotsVerticalIcon className="w-5 h-5" />
                    </button>
                 </div>
            </header>
            
            {/* Overflow Menu */}
            <AnimatePresence>
                 {isMenuOpen && (
                    <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)} />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.1 }}
                        className="fixed top-12 right-4 w-60 bg-white rounded-xl shadow-float border border-border z-50 p-1 overflow-hidden"
                    >
                        <button
                            onClick={handleShareLook}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm text-text-primary hover:bg-surface-subtle flex items-center gap-3 transition-all"
                        >
                            <ShareIcon className="w-4 h-4" />
                            Share Look
                        </button>
                        
                        {!isBaseModel && (
                            <button
                                onClick={handleDeleteCurrentLook}
                                disabled={sortedLooks.length === 0}
                                className="w-full text-left px-4 py-3 rounded-lg text-sm text-text-primary hover:bg-surface-subtle flex items-center gap-3 transition-all disabled:opacity-50"
                            >
                                <Trash2Icon className="w-4 h-4" />
                                Delete Look
                            </button>
                        )}
                        
                        <div className="h-px bg-border my-1 mx-2"></div>
                        <button
                            onClick={() => {
                                setIsMenuOpen(false);
                                onCreateNewAvatar();
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg text-sm text-text-primary hover:bg-surface-subtle flex items-center gap-3 font-medium transition-all"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create New Avatar
                        </button>
                    </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Avatar Carousel */}
            {/* pb-[100px] reserves space for the 80px collapsed bottom sheet so the avatar isn't hidden */}
            <div className="w-full flex-1 relative min-h-0 pb-[100px]">
                
                {/* Look Counter - Floating at bottom */}
                <AnimatePresence>
                    {sortedLooks.length > 0 && isCountVisible && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.3 }}
                            className="absolute bottom-[100px] left-0 right-0 flex justify-center z-20 pointer-events-none"
                        >
                            <div className="bg-black/50 backdrop-blur-md border border-white/10 shadow-sm px-3 py-1 rounded-full">
                                <span className="text-[11px] font-semibold text-white tracking-wide">
                                    {activeIndex + 1} of {sortedLooks.length}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide flex items-center"
                >
                    {sortedLooks.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 px-8 text-center mb-12 bg-white">
                            <div className="w-16 h-16 bg-surface-subtle rounded-full flex items-center justify-center mb-2">
                                <RotateCcwIcon className="w-6 h-6 text-text-secondary" />
                            </div>
                            <p className="text-lg font-bold text-text-primary">No looks saved</p>
                            <p className="text-sm text-text-secondary max-w-xs mx-auto">Create your first look by mixing and matching items in your wardrobe.</p>
                        </div>
                    ) : (
                        sortedLooks.map((look) => (
                            <div key={look.id} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center p-0">
                                <div className="relative h-full w-auto aspect-[3/4] flex items-center justify-center">
                                    <img 
                                        src={look.url} 
                                        alt="Look" 
                                        className="w-full h-full object-contain brightness-[1.08] contrast-[1.05] mix-blend-multiply" 
                                        draggable={false}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Draggable Bottom Sheet */}
            <BottomSheet isOpen={isSheetOpen} onToggle={() => setIsSheetOpen(!isSheetOpen)}>
                <div className="px-6 pb-safe pt-2 bg-white flex flex-col gap-6">
                    
                    {/* 1. ACTION BAR */}
                    <div className="flex items-center justify-center gap-3 w-full mt-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isSheetOpen) setIsSheetOpen(true);
                                setSheetMode(prev => prev === 'edit' ? 'products' : 'edit');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold transition-all ${sheetMode === 'edit' && isSheetOpen ? 'bg-black text-white shadow-md' : 'bg-surface-subtle text-text-primary hover:bg-gray-200'}`}
                        >
                            <UserIcon className="w-4 h-4" />
                            Edit
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemix();
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold bg-surface-subtle text-text-primary hover:bg-gray-200 transition-all"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Remix
                        </button>
                    </div>

                    {/* 2. DYNAMIC CONTENT (Only visible when expanded) */}
                    <AnimatePresence>
                        {isSheetOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="min-h-[160px] relative overflow-hidden pb-4"
                            >
                                <AnimatePresence mode="wait">
                                    {sheetMode === 'products' ? (
                                        <motion.div 
                                            key="products"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        >
                                            <h2 className="text-lg font-bold text-text-primary mb-4">In this look</h2>
                                            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-6 px-6">
                                                {currentLookItems.length === 0 ? (
                                                    <div className="w-full py-6 text-center bg-white rounded-xl border border-dashed border-border shadow-none">
                                                        <p className="text-sm text-text-secondary">Base model only</p>
                                                    </div>
                                                ) : (
                                                    currentLookItems.map((item, idx) => {
                                                        const price = (item as Product).price;
                                                        const brand = (item as Product).brand;
                                                        
                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                className={`flex-shrink-0 w-28 flex flex-col gap-2 ${brand ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                                                                onClick={() => {
                                                                    if (brand) {
                                                                        onProductSelect(item as Product);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white border border-border shadow-soft">
                                                                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                                                </div>
                                                                <div className="space-y-0.5 px-0.5">
                                                                    <p className="text-[11px] font-bold text-text-primary truncate uppercase tracking-wide">{brand || 'Custom'}</p>
                                                                    <p className="text-[11px] text-text-secondary truncate leading-tight">{item.name}</p>
                                                                    {price && (
                                                                        <p className="text-[11px] font-medium text-text-primary mt-0.5">${price}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="edit"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                            className="flex flex-col gap-4"
                                        >
                                            {/* Segmented Control */}
                                            <div className="bg-surface-subtle p-1 rounded-lg self-start flex gap-1">
                                                <button
                                                    onClick={() => setEditTab('body')}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${editTab === 'body' ? 'bg-white shadow-sm text-black' : 'text-text-secondary hover:text-text-primary'}`}
                                                >
                                                    Body
                                                </button>
                                                <button
                                                    onClick={() => setEditTab('vibe')}
                                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${editTab === 'vibe' ? 'bg-white shadow-sm text-black' : 'text-text-secondary hover:text-text-primary'}`}
                                                >
                                                    Vibe
                                                </button>
                                            </div>

                                            <div className="min-h-[120px]">
                                                {editTab === 'body' ? (
                                                    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-6 px-6 animate-fade-in">
                                                        {POSE_OPTIONS.map((pose, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handlePoseClick(pose.instruction)}
                                                                className="flex-shrink-0 flex flex-col items-center gap-2 w-20 group"
                                                            >
                                                                <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center transition-all group-hover:bg-black group-hover:text-white group-hover:shadow-md group-active:scale-95">
                                                                    <pose.icon className="w-7 h-7 stroke-1" />
                                                                </div>
                                                                <span className="text-[11px] font-medium text-text-primary text-center leading-tight">{pose.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-6 px-6 animate-fade-in">
                                                        {VIBE_OPTIONS.map((vibe, idx) => {
                                                            const isSelected = selectedVibeId === vibe.id;
                                                            return (
                                                                <button
                                                                    key={vibe.id}
                                                                    onClick={() => handleVibeClick(vibe.id, vibe.promptSuffix)}
                                                                    className="flex-shrink-0 flex flex-col items-center gap-2 w-20 group"
                                                                >
                                                                    <div 
                                                                        className={`w-20 h-20 rounded-2xl overflow-hidden relative transition-all group-active:scale-95 ${isSelected ? 'ring-2 ring-black ring-offset-2' : 'border border-transparent'}`}
                                                                    >
                                                                        <img 
                                                                            src={vibe.thumbnailUrl} 
                                                                            alt={vibe.label} 
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        {/* Selected Border Overlay if using internal border style */}
                                                                        {isSelected && (
                                                                            <div className="absolute inset-0 border-[3px] border-black rounded-2xl pointer-events-none" />
                                                                        )}
                                                                    </div>
                                                                    <span className={`text-[11px] font-medium text-center leading-tight ${isSelected ? 'text-black font-bold' : 'text-text-primary'}`}>{vibe.label}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </BottomSheet>
        </div>
    );
};

// Bottom Sheet Component
const BottomSheet: React.FC<{ children: React.ReactNode; isOpen: boolean; onToggle: () => void }> = ({ children, isOpen, onToggle }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (isOpen !== isExpanded) {
            setIsExpanded(isOpen);
        }
    }, [isOpen]);

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.y < -30) { // Reduced threshold for easier opening
             setIsExpanded(true);
             onToggle();
        } else if (info.offset.y > 30) {
             setIsExpanded(false);
             onToggle();
        }
    };

    return (
        <>
            <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-sheet shadow-float z-30 border-t border-border/50"
                animate={{ height: isExpanded ? 'auto' : '80px' }}
                initial={{ height: '80px' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
            >
                 <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={() => {
                     setIsExpanded(!isExpanded);
                     onToggle();
                 }}>
                     <div className="w-10 h-1 bg-gray-200 rounded-full" />
                 </div>
                 
                 <div className="overflow-hidden bg-white">
                    {children}
                 </div>
            </motion.div>
            
             <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setIsExpanded(false);
                            onToggle();
                        }}
                        className="absolute inset-0 bg-white/30 z-20 backdrop-blur-sm"
                    />
                )}
             </AnimatePresence>
        </>
    );
};

export default MyLooks;