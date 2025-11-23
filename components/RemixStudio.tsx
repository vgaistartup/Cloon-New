
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShirtIcon, PantsIcon, ShoeIcon, AccessoryIcon, SparklesIcon, XIcon, LockIcon, UnlockIcon, UploadCloudIcon, SearchIcon, ChevronDownIcon, ShoppingBagIcon } from './icons';
import { Product, ProductCategory, PRODUCT_CATEGORIES_CONFIG } from '../data/products';
import { WardrobeItem } from '../types';

interface RemixStudioProps {
  onClose: () => void;
  products: Product[];
  wardrobe: WardrobeItem[];
  onCreateLook: (items: (Product | WardrobeItem)[]) => void;
  generationProgress: number;
  queueCount?: number;
  onUpload?: (file: File) => Promise<WardrobeItem | undefined>;
}

type SlotId = 'top' | 'bottom' | 'shoes' | 'accessory';
type PickerCategory = SlotId | 'wardrobe';

interface SlotConfig {
  id: SlotId;
  label: string;
  icon: React.ElementType;
  category?: ProductCategory;
}

const SLOTS: SlotConfig[] = [
  { id: 'top', label: 'Select a Top', icon: ShirtIcon, category: 'top' },
  { id: 'bottom', label: 'Select Bottoms', icon: PantsIcon, category: 'bottom' },
  { id: 'shoes', label: 'Select Shoes', icon: ShoeIcon, category: 'shoes' },
  { id: 'accessory', label: 'Select Accessories', icon: AccessoryIcon, category: 'accessory' }, 
];

// Helper to determine slot from category
const getSlotIdFromCategory = (category?: string): SlotId | null => {
    if (!category) return null;
    if (category === 'top' || category === 'outerwear') return 'top';
    if (category === 'bottom') return 'bottom';
    if (category === 'shoes') return 'shoes';
    if (category === 'accessory') return 'accessory';
    return null;
};

// Helper component to render slot content safely
const RenderedSlotItem: React.FC<{ item: Product | WardrobeItem }> = ({ item }) => {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-surface-subtle rounded-lg p-4 text-center border border-border">
                <p className="text-xs font-bold text-text-primary truncate w-full px-2">{item.name}</p>
            </div>
        );
    }

    return (
        <>
            <img 
                src={item.url} 
                alt={item.name} 
                className="max-h-[80%] max-w-[80%] object-contain mix-blend-multiply"
                onError={() => setImgError(true)}
            />
            <p className="absolute bottom-2 text-xs font-medium text-text-secondary truncate max-w-full px-2">
                {item.name}
            </p>
        </>
    );
};

// Map Config IDs to Icons for rendering
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    'top': ShirtIcon,
    'bottom': PantsIcon,
    'shoes': ShoeIcon,
    'accessory': AccessoryIcon,
    'wardrobe': ShoppingBagIcon
};

const RemixStudio: React.FC<RemixStudioProps> = ({ onClose, products, wardrobe, onCreateLook, generationProgress, queueCount = 0, onUpload }) => {
  const [selections, setSelections] = useState<Record<SlotId, Product | WardrobeItem | null>>({
    top: null,
    bottom: null,
    shoes: null,
    accessory: null,
  });
  const [lockedSlots, setLockedSlots] = useState<Record<SlotId, boolean>>({
    top: false,
    bottom: false,
    shoes: false,
    accessory: false,
  });

  // Picker State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerActiveCategory, setPickerActiveCategory] = useState<PickerCategory>('top');
  const [pickerActiveSubCategory, setPickerActiveSubCategory] = useState<string>('All');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectProduct = (item: Product | WardrobeItem) => {
      let targetSlot: SlotId = 'top'; // Default fallback
      
      // 1. Try to infer slot from category
      if ((item as Product).category) {
          const detectedSlot = getSlotIdFromCategory((item as Product).category);
          if (detectedSlot) {
              targetSlot = detectedSlot;
          }
      } 
      // 2. If no category (e.g. raw wardrobe item) or currently in wardrobe tab,
      // fallback to the last active "slot" context. 
      else if (pickerActiveCategory !== 'wardrobe') {
          targetSlot = pickerActiveCategory;
      }

      setSelections(prev => ({ ...prev, [targetSlot]: item }));
      setIsPickerOpen(false);
      setIsSearchOpen(false);
      setSearchQuery('');
  };

  const handleSlotClick = (slotId: SlotId) => {
      setPickerActiveCategory(slotId);
      setPickerActiveSubCategory('All');
      setIsPickerOpen(true);
      setIsSearchOpen(false);
      setSearchQuery('');
  };

  const handleClearSlot = (e: React.MouseEvent, slotId: SlotId) => {
      e.stopPropagation();
      setSelections(prev => ({ ...prev, [slotId]: null }));
      setLockedSlots(prev => ({ ...prev, [slotId]: false }));
  };

  const handleToggleLock = (e: React.MouseEvent, slotId: SlotId) => {
      e.stopPropagation();
      setLockedSlots(prev => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const handleShuffle = () => {
    const newSelections = { ...selections };
    SLOTS.forEach(slot => {
      if (lockedSlots[slot.id]) return;
      
      // Map standard slots to product categories
      const categoryMap: Record<SlotId, ProductCategory[]> = {
          top: ['top', 'outerwear'],
          bottom: ['bottom'],
          shoes: ['shoes'],
          accessory: ['accessory']
      };
      
      const allowedCats = categoryMap[slot.id];
      const candidates = products.filter(p => p.category && allowedCats.includes(p.category));
      
      if (candidates.length > 0) {
          newSelections[slot.id] = candidates[Math.floor(Math.random() * candidates.length)];
      }
    });
    setSelections(newSelections);
  };

  const handleCreate = () => {
    const itemsToUse = Object.values(selections).filter((item): item is Product | WardrobeItem => item !== null);
    if (itemsToUse.length > 0) {
      onCreateLook(itemsToUse);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          if (onUpload) {
              // Use the provided onUpload which handles AI analysis and returns the item with metadata
              const newItem = await onUpload(file);
              if (newItem) {
                  handleSelectProduct(newItem);
              }
          } else {
              // Fallback behavior if onUpload is not provided
              const customItem: WardrobeItem = {
                  id: `custom-${Date.now()}`,
                  name: file.name,
                  url: URL.createObjectURL(file)
              };
              handleSelectProduct(customItem);
          }
      }
  };

  const displayedProducts = useMemo(() => {
      // 1. Global Search (Overrides Category Filters)
      if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          // Search both products and wardrobe
          const matchedProducts = products.filter(p => 
              p.name.toLowerCase().includes(query) || 
              p.brand.toLowerCase().includes(query)
          );
          const matchedWardrobe = wardrobe.filter(w => 
               w.name.toLowerCase().includes(query)
          );
          return [...matchedProducts, ...matchedWardrobe];
      }

      // 2. Wardrobe Category
      if (pickerActiveCategory === 'wardrobe') {
          // Filter wardrobe items based on subCategory (if we had subcats for wardrobe)
          // For now, Wardrobe just shows everything or we could filter by 'All'
          return wardrobe;
      }

      // 3. Filter by top-level product category
      let filtered = products;
      if (pickerActiveCategory === 'top') {
          filtered = products.filter(p => p.category === 'top' || p.category === 'outerwear');
      } else {
          filtered = products.filter(p => p.category === pickerActiveCategory);
      }

      // 4. Filter by sub-category if not 'All'
      if (pickerActiveSubCategory !== 'All') {
          filtered = filtered.filter(p => {
              if (p.subCategory === pickerActiveSubCategory) return true;
              if (!p.subCategory) {
                  return p.name.toLowerCase().includes(pickerActiveSubCategory.toLowerCase()) || 
                         p.brand.toLowerCase().includes(pickerActiveSubCategory.toLowerCase());
              }
              return false;
          });
      }

      return filtered;
  }, [pickerActiveCategory, pickerActiveSubCategory, products, wardrobe, searchQuery]);

  // Get subcategories based on active category
  const activeSubCategories = useMemo(() => {
      if (pickerActiveCategory === 'wardrobe') return ['All'];
      const config = PRODUCT_CATEGORIES_CONFIG.find(c => c.id === pickerActiveCategory);
      return config ? config.subCategories : ['All'];
  }, [pickerActiveCategory]);
  
  // Logic for Header Title
  let headerTitle = "Look Studio";
  if (isPickerOpen) {
      if (isSearchOpen) {
          headerTitle = ""; // Handled by input
      } else {
          const titles: Record<string, string> = {
              top: 'Top',
              bottom: 'Bottoms',
              shoes: 'Shoes',
              accessory: 'Accessories',
              wardrobe: 'My Wardrobe'
          };
          headerTitle = titles[pickerActiveCategory] || 'Select Item';
      }
  }

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (generationProgress / 100) * circumference;

  return (
    <div className="h-full w-full bg-white flex flex-col">
      
      {/* SHARED HEADER */}
      <header className="flex items-center justify-between px-4 border-b border-border shrink-0 bg-white/95 backdrop-blur-xl relative z-20 h-[60px]">
        {/* Left Action: Rotate between Down (Close) and Left (Back) */}
        <button 
            onClick={() => isPickerOpen ? setIsPickerOpen(false) : onClose()} 
            className="p-2 rounded-full hover:bg-surface-subtle transition-colors"
        >
          {/* Same chevron used in look studio (down) and picker (left/down) logic */}
          <ChevronDownIcon 
            className={`w-6 h-6 text-text-primary transition-transform duration-300 ease-in-out ${isPickerOpen ? 'rotate-90' : 'rotate-0'}`} 
          />
        </button>

        {/* Center Title or Search Input */}
        <div className="flex-1 flex justify-center px-2 relative">
             <AnimatePresence mode="wait">
                {isPickerOpen && isSearchOpen ? (
                     <motion.input 
                        key="search-input"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        autoFocus
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full max-w-[200px] text-center bg-transparent border-b border-gray-300 focus:border-black outline-none pb-1 text-sm font-medium placeholder-gray-400"
                    />
                ) : (
                    <motion.h1 
                        key="title-text"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-lg font-bold text-text-primary truncate text-center"
                    >
                        {headerTitle}
                    </motion.h1>
                )}
             </AnimatePresence>
        </div>

        {/* Right Action: Search Toggle (Picker) or Spinner (Grid) */}
        <div className="w-auto min-w-[40px] flex items-center justify-end">
            {isPickerOpen ? (
                 <button 
                    onClick={() => {
                        setIsSearchOpen(!isSearchOpen);
                        if (!isSearchOpen) setSearchQuery('');
                    }} 
                    className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-black text-white' : 'bg-surface-subtle text-text-primary hover:bg-gray-200'}`}
                >
                    <SearchIcon className="w-5 h-5" />
                </button>
            ) : (
                 queueCount > 0 && (
                    <div className="p-2 flex items-center justify-center">
                        <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
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
                )
            )}
        </div> 
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
          
          {/* 1. GRID VIEW (Underneath) */}
          <div className="absolute inset-0 flex flex-col bg-white">
              {/* Scrollable Grid */}
              <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                <div className="flex-1 grid grid-cols-2 grid-rows-2 relative min-h-[400px]">
                    {/* Dividers */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
                    </div>

                    {SLOTS.map((slot) => {
                        const selectedItem = selections[slot.id];
                        const isLocked = lockedSlots[slot.id];

                        return (
                            <div 
                                key={slot.id} 
                                onClick={() => handleSlotClick(slot.id)}
                                className="relative flex flex-col items-center justify-center p-6 hover:bg-surface-subtle transition-colors cursor-pointer group"
                            >
                                {selectedItem ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {/* Lock Button */}
                                        <button 
                                            onClick={(e) => handleToggleLock(e, slot.id)}
                                            className={`absolute top-0 left-0 p-1.5 rounded-full shadow-sm border transition-all z-20 ${isLocked ? 'bg-black border-black text-white' : 'bg-white border-border text-gray-400 hover:text-black'}`}
                                        >
                                            {isLocked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
                                        </button>

                                        {/* Remove Button */}
                                        <button 
                                            onClick={(e) => handleClearSlot(e, slot.id)}
                                            className="absolute top-0 right-0 p-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-border z-20 hover:bg-gray-50"
                                        >
                                            <XIcon className="w-4 h-4 text-gray-500" />
                                        </button>

                                        {/* Slot Item */}
                                        <RenderedSlotItem item={selectedItem} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 opacity-40 group-hover:opacity-60 transition-opacity text-center">
                                        <slot.icon className="w-16 h-16 text-gray-600" />
                                        {/* Removed Text Label per previous request */}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border bg-white flex gap-3 shrink-0">
                  <button 
                    onClick={handleShuffle}
                    className="flex-1 py-3.5 bg-white border border-border rounded-full font-medium text-text-primary flex items-center justify-center gap-2 hover:bg-surface-subtle transition-colors"
                  >
                      <SparklesIcon className="w-5 h-5" />
                      Shuffle
                  </button>
                  <button 
                    onClick={handleCreate}
                    className="flex-[2] py-3.5 bg-black text-white rounded-full font-bold flex items-center justify-center shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
                    disabled={Object.values(selections).every(v => v === null)}
                  >
                      Create Look
                  </button>
              </div>
          </div>

          {/* 2. PICKER VIEW (Slide Up Overlay) */}
          <AnimatePresence>
              {isPickerOpen && (
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute inset-0 z-10 bg-white flex flex-col"
                  >
                      {/* 1. Category Icons Row */}
                      <div className="flex items-center justify-around p-6 border-b border-border shrink-0 bg-white">
                            {/* Wardrobe Icon */}
                             <button 
                                onClick={() => {
                                    setPickerActiveCategory('wardrobe');
                                    setPickerActiveSubCategory('All');
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                }}
                                className={`transition-all duration-200 flex flex-col items-center ${pickerActiveCategory === 'wardrobe' ? 'opacity-100 scale-110 text-black' : 'opacity-30 hover:opacity-50 text-gray-900'}`}
                                aria-label="My Wardrobe"
                            >
                                <ShoppingBagIcon className="w-16 h-16" />
                            </button>

                            {/* Product Categories */}
                            {PRODUCT_CATEGORIES_CONFIG.map((cat) => {
                                const isActive = pickerActiveCategory === cat.id;
                                const IconComponent = CATEGORY_ICONS[cat.id] || ShirtIcon;
                                return (
                                    <button 
                                        key={cat.id}
                                        onClick={() => {
                                            setPickerActiveCategory(cat.id as SlotId);
                                            setPickerActiveSubCategory('All');
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className={`transition-all duration-200 flex flex-col items-center ${isActive ? 'opacity-100 scale-110 text-black' : 'opacity-30 hover:opacity-50 text-gray-900'}`}
                                        aria-label={cat.label}
                                    >
                                        <IconComponent className="w-16 h-16" />
                                    </button>
                                )
                            })}
                      </div>

                      {/* 2. Sub-category Pills */}
                      <div className="px-4 py-4 border-b border-border overflow-x-auto scrollbar-hide shrink-0 bg-surface-subtle">
                            <div className="flex gap-4">
                                {activeSubCategories.map((sub) => (
                                    <button
                                        key={sub}
                                        onClick={() => setPickerActiveSubCategory(sub)}
                                        className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                            pickerActiveSubCategory === sub 
                                            ? 'bg-black text-white shadow-md' 
                                            : 'bg-white border border-gray-200 text-text-secondary hover:border-gray-400'
                                        }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                      </div>

                      {/* 3. Scrollable Product Grid */}
                      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-safe">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-6 pb-20">
                              {/* Upload Option */}
                              <label className="aspect-[3/4] border border-dashed border-border rounded-card flex flex-col items-center justify-center text-text-secondary hover:border-text-primary cursor-pointer bg-white group shadow-sm hover:shadow-md transition-all">
                                    <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center mb-2 transition-transform group-hover:scale-110">
                                        <UploadCloudIcon className="w-6 h-6 text-gray-400 group-hover:text-black"/>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-600 group-hover:text-black">Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                              </label>

                              {/* Render Items */}
                              {displayedProducts.map(item => {
                                  // Determine correct slot for indicator check
                                  let targetSlot: SlotId = 'top';
                                  // Try to deduce slot from category
                                  if ((item as Product).category) {
                                      const detected = getSlotIdFromCategory((item as Product).category);
                                      if (detected) targetSlot = detected;
                                  } else if (pickerActiveCategory !== 'wardrobe') {
                                      // If browsing specific slot category, use that
                                      targetSlot = pickerActiveCategory as SlotId;
                                  }
                                  
                                  const isSelected = selections[targetSlot]?.id === item.id;
                                  // Check if it's a product or wardrobe item for price rendering
                                  const price = (item as Product).price;
                                  const brand = (item as Product).brand;

                                  return (
                                      <div 
                                        key={item.id}
                                        onClick={() => handleSelectProduct(item)}
                                        className="flex flex-col gap-2 cursor-pointer group"
                                      >
                                          <div className="aspect-[3/4] bg-white rounded-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-all relative">
                                              <img src={item.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={item.name} />
                                              
                                              {/* Active Indicator */}
                                              {isSelected && (
                                                  <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1 shadow-sm">
                                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                  </div>
                                              )}
                                          </div>
                                          <div className="px-1">
                                            {brand ? (
                                                <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{brand}</p>
                                            ) : (
                                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Wardrobe</p>
                                            )}
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-sm font-medium text-text-primary truncate flex-1 mr-2">{item.name}</p>
                                                {price && <p className="text-sm font-semibold text-text-primary">${price}</p>}
                                            </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                          
                          {displayedProducts.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                  <SearchIcon className="w-12 h-12 mb-3 opacity-20" />
                                  <p className="text-sm font-medium">No items found</p>
                              </div>
                          )}
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>
      </div>
    </div>
  );
};

export default RemixStudio;