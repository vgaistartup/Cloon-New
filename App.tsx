/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, analyzeOutfitStyle } from './services/geminiService';
import { OutfitLayer, WardrobeItem, Look } from './types';
import { XIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';
import ChatBot from './components/ChatBot';
import StyleScorePopup from './components/StyleScorePopup';
import Header from './components/Header';
import BottomNav, { Tab } from './components/BottomNav';
import Home from './components/Home';
import MyLooks from './components/MyLooks';
import WardrobeView from './components/WardrobeView';
import { Product } from './data/products';
import { productService } from './data/productService';
import ProductDetail from './components/ProductDetail';
import SplashScreen from './components/SplashScreen';
import AdminDashboard from './components/AdminDashboard';
import Settings from './components/Settings';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    if (mediaQueryList.matches !== matches) { setMatches(mediaQueryList.matches); }
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query, matches]);

  return matches;
};

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [wishlist, setWishlist] = useState<WardrobeItem[]>([]); 
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [styleScoreResult, setStyleScoreResult] = useState<{ score: number; explanation: string } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const loadProducts = useCallback(async () => {
      try {
        const fetchedProducts = await productService.getProducts();
        setProducts(fetchedProducts);
      } catch (err) {
        setError(getFriendlyErrorMessage(err, "Failed to load products from the database"));
      }
  }, []);

  useEffect(() => {
    loadProducts();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [loadProducts]);

  const activeOutfitLayers = useMemo(() => outfitHistory.slice(0, currentOutfitIndex + 1), [outfitHistory, currentOutfitIndex]);
  const activeGarmentIds = useMemo(() => activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], [activeOutfitLayers]);
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;
    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.brand.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{ garment: null, poseImages: { [POSE_INSTRUCTIONS[0]]: url } }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
    setWishlist([]);
    setStyleScoreResult(null);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;
    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0);
        return;
    }
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);
    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
      const newLayer: OutfitLayer = { garment: garmentInfo, poseImages: { [POSE_INSTRUCTIONS[currentPoseIndex]]: newImageUrl } };
      setOutfitHistory(prev => [...prev.slice(0, currentOutfitIndex + 1), newLayer]);
      setCurrentOutfitIndex(prev => prev + 1);
      setWardrobe(prev => prev.find(item => item.id === garmentInfo.id) ? prev : [...prev, garmentInfo]);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0);
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }
    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;
    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);
    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        newHistory[currentOutfitIndex].poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  const handleAnalyzeStyle = async () => {
    if (!displayImageUrl || isLoading) return;
    setIsLoading(true);
    setLoadingMessage('Analyzing Style...');
    setError(null);
    try {
        const result = await analyzeOutfitStyle(displayImageUrl);
        setStyleScoreResult(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to analyze style'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleTryOn = async (item: Product | WardrobeItem) => {
    setSelectedProduct(null); 
    setIsStudioOpen(true);
    if (modelImageUrl && !isLoading) {
       try {
         const imageUrlToFetch = (item as Product).urls?.[0] ?? item.url;
         const response = await fetch(imageUrlToFetch);
         const blob = await response.blob();
         const file = new File([blob], item.name, { type: blob.type });
         await handleGarmentSelect(file, item);
       } catch (err) {
         setError(getFriendlyErrorMessage(err, "Could not load this product for styling. Please try another"));
       }
    }
  };
  
  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => prev.some(item => item.id === product.id) ? prev.filter(item => item.id !== product.id) : [...prev, product]);
  };

  const handleToggleWardrobe = (product: Product) => {
    setWardrobe(prev => prev.some(item => item.id === product.id) ? prev.filter(item => item.id !== product.id) : [...prev, product]);
  };

  const handleProductSelect = (item: Product | WardrobeItem) => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      setSelectedProduct(product);
    }
  };

  const closeStudio = () => setIsStudioOpen(false);

  const studioVariants = {
    initial: { opacity: 0, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' },
  };

  const allGeneratedLooks = useMemo(() => {
    const looks: Look[] = [];
    outfitHistory.forEach((layer, index) => {
         const items = outfitHistory.slice(1, index + 1).map(l => l.garment?.name).filter(Boolean) as string[];
         const isBase = items.length === 0;
         Object.entries(layer.poseImages).forEach(([pose, url]) => {
            const imgUrl = url as string;
            if (!looks.find(l => l.url === imgUrl)) {
                looks.push({ id: imgUrl, url: imgUrl, items: isBase ? ['Base Model'] : items, timestamp: Date.now() });
            }
         });
    });
    return looks.reverse();
  }, [outfitHistory]);

  if (isAdmin) {
    return <AdminDashboard onBack={() => {
        setIsAdmin(false);
        loadProducts();
    }} />;
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      
      <div className="font-sans h-[100dvh] w-screen bg-[#F5F5F7] overflow-hidden flex flex-col text-[#1D1D1F]">
        {/* Pass onSearch to Header */}
        {activeTab !== 'looks' && <Header onOpenSettings={() => setShowSettings(true)} onSearch={setSearchQuery} />}
        <main className={`flex-grow flex flex-col ${activeTab === 'looks' ? 'overflow-hidden relative h-full' : 'overflow-y-auto scrollbar-hide'}`}>
          {/* Pass filteredProducts to Home */}
          {activeTab === 'home' && <Home products={filteredProducts} recentLooks={allGeneratedLooks} onProductSelect={handleProductSelect} onChangeTab={setActiveTab} wishlist={wishlist} onToggleWishlist={handleToggleWishlist} />}
          {activeTab === 'wardrobe' && <WardrobeView wardrobe={wardrobe} onProductSelect={handleProductSelect} />}
          {activeTab === 'looks' && <MyLooks looks={allGeneratedLooks} modelImageUrl={modelImageUrl} onModelFinalized={handleModelFinalized} onResetModel={handleStartOver} />}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        <AnimatePresence>
          {isStudioOpen && (
              <motion.div
                  className="fixed inset-0 z-50 bg-white flex flex-col"
                  variants={studioVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                  <button onClick={closeStudio} className="absolute top-4 right-4 z-50 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><XIcon className="w-6 h-6 text-gray-800" /></button>
                  {!modelImageUrl ? (
                      <div className="w-full h-full overflow-y-auto bg-[#F5F5F7] scrollbar-hide"><StartScreen onModelFinalized={handleModelFinalized} /></div>
                  ) : (
                      <div className="relative flex flex-col h-full">
                           <div className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
                               <div className="w-full h-full flex-grow flex items-center justify-center bg-[#F5F5F7] pb-20 relative">
                                  <Canvas displayImageUrl={displayImageUrl} onStartOver={handleStartOver} isLoading={isLoading} loadingMessage={loadingMessage} onSelectPose={handlePoseSelect} poseInstructions={POSE_INSTRUCTIONS} currentPoseIndex={currentPoseIndex} availablePoseKeys={availablePoseKeys} onAnalyzeStyle={handleAnalyzeStyle} />
                                </div>
                               <aside className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/90 backdrop-blur-xl flex flex-col border-t md:border-t-0 md:border-l border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}>
                                  <button onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} className="md:hidden w-full h-8 flex items-center justify-center bg-transparent"><div className="w-12 h-1.5 bg-gray-300 rounded-full mt-2"></div></button>
                                  <div className="p-6 pb-24 overflow-y-auto flex-grow flex flex-col gap-8">
                                      {error && (<div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-r-md" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>)}
                                      <OutfitStack outfitHistory={activeOutfitLayers} onRemoveLastGarment={handleRemoveLastGarment} />
                                      <WardrobePanel onGarmentSelect={handleGarmentSelect} activeGarmentIds={activeGarmentIds} isLoading={isLoading} wardrobe={wardrobe} />
                                  </div>
                               </aside>
                           </div>
                           <AnimatePresence>
                              {isLoading && isMobile && (
                                  <motion.div className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                  <Spinner />
                                  {loadingMessage && (<p className="text-lg font-medium text-gray-800 mt-4 text-center px-4">{loadingMessage}</p>)}
                                  </motion.div>
                              )}
                           </AnimatePresence>
                      </div>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
        
        <ProductDetail 
          products={products}
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onTryOn={handleTryOn}
          onToggleWardrobe={handleToggleWardrobe}
          isInWardrobe={!!selectedProduct && wardrobe.some(item => item.id === selectedProduct.id)}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
        />
        
        <ChatBot />

        <AnimatePresence>
            {showSettings && (
                <Settings 
                    onClose={() => setShowSettings(false)} 
                    onOpenDashboard={() => {
                        setShowSettings(false);
                        setIsAdmin(true);
                    }} 
                />
            )}
        </AnimatePresence>

        {styleScoreResult && <StyleScorePopup score={styleScoreResult.score} explanation={styleScoreResult.explanation} onClose={() => setStyleScoreResult(null)} />}
      </div>
    </>
  );
};

export default App;