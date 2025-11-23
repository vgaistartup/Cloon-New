
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabaseClient'; // Auth Client
import Auth from './components/Auth'; // Auth Screen
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generateLookVariation, analyzeOutfitStyle, generateCompleteLook, analyzeWardrobeItem } from './services/geminiService';
import { OutfitLayer, WardrobeItem, Look, GenerationTask } from './types';
import { XIcon, LockIcon } from './components/icons';
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
import { userDataService } from './data/userDataService';
import RemixStudio from './components/RemixStudio';
import LoadingOverlay from './components/LoadingOverlay';

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
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  
  // Model & Look State
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<Look[]>([]);
  const [initialLookId, setInitialLookId] = useState<string | null>(null);
  
  // Queue & Progress State
  const [generationQueue, setGenerationQueue] = useState<GenerationTask[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [wishlist, setWishlist] = useState<WardrobeItem[]>([]); 
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showRemixStudio, setShowRemixStudio] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // API Key Selection State
  const [hasApiKey, setHasApiKey] = useState(false);

  // 1. Check Supabase Session on Mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Check for API Key Selection (Only if logged in)
  useEffect(() => {
      if (!session) return;
      const checkApiKey = async () => {
          if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
              const hasKey = await (window as any).aistudio.hasSelectedApiKey();
              setHasApiKey(hasKey);
          } else {
              setHasApiKey(true);
          }
      };
      checkApiKey();
  }, [session]);

  const handleConnectApiKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          setHasApiKey(true);
      }
  };

  const savedLooksRef = useRef<Look[]>([]);
  useEffect(() => {
      savedLooksRef.current = savedLooks;
  }, [savedLooks]);

  const totalPendingCount = generationQueue.length;

  const loadProducts = useCallback(async () => {
      try {
        const fetchedProducts = await productService.getProducts();
        setProducts(fetchedProducts);
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err, "Failed to load products from the database"));
      }
  }, []);

  const loadUserData = useCallback(async () => {
      if (!session) return;
      
      try {
          const [model, dbLooks, dbWardrobe] = await Promise.all([
              userDataService.getLatestModel(),
              userDataService.getLooks(),
              userDataService.getWardrobe()
          ]);
          
          let initialLooks: Look[] = [];

          if (model) {
              setModelImageUrl(model.url);
              setModelId(model.id);
              
              const baseLook: Look = {
                  id: `model-base-${model.id}`,
                  url: model.url,
                  garments: [],
                  timestamp: model.createdAt,
                  userId: model.userId
              };
              initialLooks.push(baseLook);
          }

          const combinedLooks = [...initialLooks, ...dbLooks].sort((a, b) => b.timestamp - a.timestamp);
          
          setSavedLooks(combinedLooks);
          setWardrobe(dbWardrobe);

      } catch (err) {
          console.error("Failed to load user data:", err);
      }
  }, [session]);

  useEffect(() => {
    if (session && hasApiKey) {
        loadProducts();
        loadUserData();
    
        const timer = setTimeout(() => {
          setShowSplash(false);
        }, 1500);
    
        return () => clearTimeout(timer);
    }
  }, [loadProducts, loadUserData, hasApiKey, session]);

  useEffect(() => {
    if (session && hasApiKey && (activeTab === 'looks' || activeTab === 'wardrobe')) {
      loadUserData();
    }
  }, [activeTab, loadUserData, hasApiKey, session]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.brand.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleModelFinalized = async (url: string) => {
    setModelImageUrl(url);

    const tempLookId = `temp-base-${Date.now()}`;
    const baseLook: Look = {
        id: tempLookId,
        url: url,
        garments: [],
        timestamp: Date.now(),
        userId: session?.user?.id
    };
    setSavedLooks(prev => [baseLook, ...prev]);
    
    try {
        const savedModel = await userDataService.saveModel(url);
        if (savedModel) {
            setModelId(savedModel.id);
        }
    } catch (err) {
        console.error("Failed to save model:", err);
    }
    
    setActiveTab('looks');
  };

  const handleCreateNewAvatar = async () => {
        if (modelId) {
            try {
                await userDataService.deleteModel(modelId);
            } catch (err) {
                console.error("Failed to delete old model from DB:", err);
            }
        }

        setModelImageUrl(null);
        setModelId(null);
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
        setWardrobe(defaultWardrobe); 
        setWishlist([]);
        setSavedLooks([]); 
        setGenerationQueue([]);
  };

  const fetchFileFromUrl = async (url: string, name: string): Promise<File> => {
      // 0. Handle Data URLs directly
      if (url.startsWith('data:')) {
          try {
              const res = await fetch(url);
              const blob = await res.blob();
              return new File([blob], name, { type: blob.type || 'image/png' });
          } catch (e) {
              console.error("Failed to process data URL", e);
          }
      }

      // Fix Firebase Storage URLs to ensure they serve media instead of metadata
      let targetUrl = url;
      if (url.includes('firebasestorage.googleapis.com') && !url.includes('alt=media')) {
          const separator = url.includes('?') ? '&' : '?';
          targetUrl = `${url}${separator}alt=media`;
          console.log(`[ImageLoader] Adjusted Firebase URL: ${targetUrl}`);
      }

      // Helper to try fetching with proper mode
      const tryFetch = async (fetchUrl: string) => {
          const response = await fetch(fetchUrl, { mode: 'cors', credentials: 'omit' });
          if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
          return response.blob();
      };

      try {
          // 1. Try Direct Fetch
          const blob = await tryFetch(targetUrl);
          return new File([blob], name, { type: blob.type || 'image/png' });
      } catch (directError) {
          console.warn(`[ImageLoader] Direct fetch failed for ${targetUrl}, trying proxies...`, directError);
          
          try {
              // 2. Try Primary Proxy (corsproxy.io)
              const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
              const blob = await tryFetch(proxyUrl);
              return new File([blob], name, { type: blob.type || 'image/png' });
          } catch (proxyError1) {
              console.warn(`[ImageLoader] Primary proxy failed, trying secondary...`, proxyError1);
              
              try {
                  // 3. Try Secondary Proxy (allorigins.win) - often reliable for images
                  const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
                  const blob = await tryFetch(proxyUrl2);
                  return new File([blob], name, { type: blob.type || 'image/png' });
              } catch (proxyError2) {
                  console.error("[ImageLoader] All fetch attempts failed", proxyError2);
                  
                  // 4. Fallback to transparent placeholder (Prevents app crash, but result will be empty)
                  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                  const res = await fetch(`data:image/png;base64,${base64}`);
                  const blob = await res.blob();
                  return new File([blob], "placeholder.png", { type: "image/png" });
              }
          }
      }
  };

  useEffect(() => {
    const processNext = async () => {
        if (isProcessingQueue || generationQueue.length === 0) return;

        setIsProcessingQueue(true);
        const currentTask = generationQueue[0];

        try {
            await executeTask(currentTask);
        } catch (err) {
            console.error("Task failed:", err);
        } finally {
            setGenerationQueue(prev => prev.slice(1));
            setIsProcessingQueue(false);
        }
    };

    if (session && hasApiKey) {
        processNext();
    }
  }, [generationQueue, isProcessingQueue, modelImageUrl, hasApiKey, session]);

  const executeTask = async (task: GenerationTask) => {
      if (!modelImageUrl) {
          console.warn("Queue: No base model available. Skipping task.");
          return;
      }

      setGenerationProgress(5);
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
            if (prev >= 90) return prev; 
            return prev + Math.random() * 6 + 2;
        });
      }, 400);

      try {
          let newImageUrl = '';

          if (task.type === 'try-on' || task.type === 'remix') {
               const items = task.items || [];
               const files = await Promise.all(items.map(async item => {
                    const imageUrlToFetch = (item as Product).urls?.[0] ?? item.url;
                    return await fetchFileFromUrl(imageUrlToFetch, item.name);
               }));
               
               if (task.type === 'try-on') {
                   newImageUrl = await generateVirtualTryOnImage(modelImageUrl, files[0]);
               } else {
                   newImageUrl = await generateCompleteLook(modelImageUrl, files);
               }

                const tempLookId = `look-${Date.now()}`;
                const newLook: Look = {
                        id: tempLookId,
                        url: newImageUrl,
                        garments: items.map(i => ({ ...i })),
                        timestamp: Date.now(),
                        userId: session?.user?.id
                };

                setSavedLooks(prev => [newLook, ...prev]);

                const savedLookData = await userDataService.saveLook({
                    url: newImageUrl,
                    garments: items.map(i => ({ id: i.id, name: i.name, url: i.url }))
                });

                if (savedLookData) {
                    setSavedLooks(prev => {
                        const exists = prev.some(l => l.id === tempLookId);
                        if (!exists) {
                            userDataService.deleteLook(savedLookData.id).catch(console.error);
                            return prev;
                        }
                        return prev.map(look => look.id === tempLookId ? { ...look, id: savedLookData.id } : look);
                    });
                }

          } else if (task.type === 'pose') {
               const targetLook = savedLooksRef.current.find(l => l.id === task.lookId);
               if (!targetLook || (!task.poseInstruction && !task.vibeInstruction)) {
                   throw new Error("Invalid pose/vibe task data");
               }

               newImageUrl = await generateLookVariation(targetLook.url, {
                   pose: task.poseInstruction,
                   vibe: task.vibeInstruction
               });
               const tempLookId = `look-${Date.now()}`;

               const newLook: Look = {
                    id: tempLookId,
                    url: newImageUrl,
                    garments: targetLook.garments,
                    timestamp: Date.now(),
                    userId: session?.user?.id
               };

               setSavedLooks(prev => [newLook, ...prev]);

               const savedLookData = await userDataService.saveLook({
                    url: newImageUrl,
                    garments: targetLook.garments
                });

                if (savedLookData) {
                    setSavedLooks(prev => {
                        const exists = prev.some(l => l.id === tempLookId);
                        if (!exists) {
                            userDataService.deleteLook(savedLookData.id).catch(console.error);
                            return prev;
                        }
                        return prev.map(look => look.id === tempLookId ? { ...look, id: savedLookData.id } : look);
                    });
                }
          }

          setGenerationProgress(100);

      } catch (err: any) {
          console.error("Queue Task Execution Error:", err);
          setError(getFriendlyErrorMessage(err, "Generation failed."));
      } finally {
          clearInterval(progressInterval);
          setTimeout(() => {
              setGenerationProgress(0);
          }, 500);
      }
  };

  const handleTryOn = (item: Product | WardrobeItem) => {
      setSelectedProduct(null); 
      
      const newTask: GenerationTask = {
          id: `task-${Date.now()}`,
          type: 'try-on',
          items: [item],
          timestamp: Date.now()
      };
      
      setGenerationQueue(prev => [...prev, newTask]);
  };

  const handleRemixLook = (items: (Product | WardrobeItem)[]) => {
      if (!modelImageUrl) {
          alert("Please create a model first before remixing.");
          setActiveTab('looks');
          setShowRemixStudio(false);
          return;
      }

      const newTask: GenerationTask = {
          id: `task-${Date.now()}`,
          type: 'remix',
          items: items,
          timestamp: Date.now()
      };

      setGenerationQueue(prev => [...prev, newTask]);
      setShowRemixStudio(false);
      setActiveTab('looks');
  };

  const handleVariationSelect = (lookId: string, config: { pose?: string, vibe?: string }) => {
      const newTask: GenerationTask = {
          id: `task-${Date.now()}`,
          type: 'pose',
          lookId,
          poseInstruction: config.pose,
          vibeInstruction: config.vibe,
          timestamp: Date.now()
      };
      setGenerationQueue(prev => [...prev, newTask]);
  };
  
  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => prev.some(item => item.id === product.id) ? prev.filter(item => item.id !== product.id) : [...prev, product]);
  };

  const handleToggleWardrobe = async (product: Product) => {
    const exists = wardrobe.some(item => item.id === product.id);
    
    setWardrobe(prev => exists ? prev.filter(item => item.id !== product.id) : [...prev, product]);

    try {
        if (exists) {
            await userDataService.removeFromWardrobe(product.id);
        } else {
            await userDataService.addToWardrobe(product, product.category);
        }
    } catch (err) {
        console.error("Failed to sync wardrobe:", err);
    }
  };

  const handleDeleteWardrobeItems = async (itemIds: string[]) => {
      const previousWardrobe = [...wardrobe];
      
      setWardrobe(prev => prev.filter(item => !itemIds.includes(item.id)));
      
      try {
          const success = await userDataService.removeMultipleFromWardrobe(itemIds);
          if (!success) {
               throw new Error("Failed to delete from database");
          }
      } catch (err) {
          console.error("Failed to delete items from wardrobe:", err);
          setWardrobe(previousWardrobe);
          alert("Could not delete items. Please check your connection or permissions.");
      }
  };
  
  // Non-blocking upload handler
  const handleCustomUpload = async (file: File): Promise<WardrobeItem | undefined> => {
      // 1. Create temporary item immediately to unblock UI
      const tempId = `custom-${Date.now()}`;
      
      let base64Url = '';
      try {
          base64Url = await new Promise<string>((resolve) => {
               const reader = new FileReader();
               reader.onload = (e) => resolve(e.target?.result as string);
               reader.readAsDataURL(file);
          });
      } catch (e) {
          console.error("Failed to read file", e);
          return undefined;
      }

      const tempItem: WardrobeItem = {
          id: tempId,
          name: file.name,
          url: base64Url,
          category: 'processing', 
          isAnalyzing: true // Mark as analyzing
      };
      
      // 2. Update state immediately
      setWardrobe(prev => [tempItem, ...prev]);
      
      // 3. Trigger background analysis
      analyzeWardrobeItem(file).then(async (analysis) => {
          const updatedItem: WardrobeItem = {
              ...tempItem,
              ...analysis,
              name: analysis.name || tempItem.name,
              category: analysis.category || 'top',
              isAnalyzing: false // Finished analyzing
          };
          
          // Update local state with enriched data
          setWardrobe(prev => prev.map(item => item.id === tempId ? updatedItem : item));
          
          // Save to Database (after we have the metadata)
          try {
              await userDataService.addToWardrobe(updatedItem, updatedItem.category);
          } catch (err) {
              console.error("Failed to save background analyzed item to DB:", err);
          }
      }).catch(err => {
          console.error("Background analysis failed:", err);
          // Stop spinner, keep as basic item
          setWardrobe(prev => prev.map(item => item.id === tempId ? { ...item, isAnalyzing: false, category: 'custom' } : item));
          // Still try to save
          userDataService.addToWardrobe({ ...tempItem, category: 'custom', isAnalyzing: false }, 'custom');
      });

      // 4. Return the temp item immediately so callers (like RemixStudio) can use it
      return tempItem;
  };

  const handleProductSelect = (item: Product | WardrobeItem) => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      setSelectedProduct(product);
    }
  };
  
  const handleDeleteLook = async (lookId: string) => {
        console.log("App: Deleting Look ID:", lookId);
        
        const previousLooks = [...savedLooks];
        setSavedLooks(prev => prev.filter(l => l.id !== lookId));
        
        try {
            if (!lookId.startsWith('model-base-') && !lookId.startsWith('temp-base-') && !lookId.startsWith('look-')) {
                const success = await userDataService.deleteLook(lookId);
                if (!success) {
                    throw new Error("Database delete failed");
                }
            } 
        } catch (err) {
            console.error("Failed to delete look from DB:", err);
            setSavedLooks(previousLooks);
            alert("Failed to delete look. Please try again.");
        }
  };

  const handleLookSelect = (lookId: string) => {
      setInitialLookId(lookId);
      setActiveTab('looks');
  };

  const handleResetInitialLookId = useCallback(() => {
    setInitialLookId(null);
  }, []);

  // Render Logic
  if (!authChecked) return null; // Initial loading

  if (!session) {
    return <Auth />;
  }

  if (!hasApiKey) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-white p-6 text-center">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                 <LockIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to Cloon</h1>
              <p className="text-text-secondary mb-8 max-w-md leading-relaxed">
                  Connect your Google account to unlock the high-quality styling models required for this experience.
              </p>
              <button 
                  onClick={handleConnectApiKey}
                  className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-elevated flex items-center gap-3"
              >
                  Connect Google AI
              </button>
              <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-8 text-xs font-medium text-gray-400 hover:text-gray-600 hover:underline transition-colors"
              >
                  View Billing Documentation
              </a>
          </div>
      );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      
      {isLoading && loadingMessage && (
         <LoadingOverlay message={loadingMessage} />
      )}
      
      <div className="font-sans h-[100dvh] w-screen bg-white overflow-hidden flex flex-col text-[#1D1D1F]">
        {activeTab !== 'looks' && activeTab !== 'wardrobe' && !showRemixStudio && (
            <Header 
                onOpenSettings={() => setShowSettings(true)} 
                onSearch={setSearchQuery} 
                onOpenChat={() => setIsChatOpen(true)} 
                generationProgress={generationProgress}
                queueCount={totalPendingCount}
            />
        )}
        
        <main className={`flex-grow flex flex-col overflow-y-auto scrollbar-hide`}>
          {activeTab === 'home' && <Home products={filteredProducts} recentLooks={savedLooks} onProductSelect={handleProductSelect} onChangeTab={setActiveTab} wishlist={wishlist} onToggleWishlist={handleToggleWishlist} onLookSelect={handleLookSelect} />}
        </main>
        
        <AnimatePresence>
          {activeTab === 'wardrobe' && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-50 bg-white"
              >
                  <WardrobeView 
                    wardrobe={wardrobe} 
                    onProductSelect={handleProductSelect} 
                    onUpload={handleCustomUpload} 
                    onDeleteItems={handleDeleteWardrobeItems}
                    onClose={() => setActiveTab('home')}
                    generationProgress={generationProgress}
                    queueCount={totalPendingCount}
                    onTryOn={handleTryOn}
                  />
              </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeTab === 'looks' && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-50 bg-white"
              >
                  <MyLooks 
                    looks={savedLooks} 
                    products={products} 
                    modelImageUrl={modelImageUrl} 
                    onModelFinalized={handleModelFinalized} 
                    onCreateNewAvatar={handleCreateNewAvatar} 
                    onDeleteLook={handleDeleteLook} 
                    onProductSelect={handleProductSelect} 
                    initialLookId={initialLookId}
                    onResetInitialLookId={handleResetInitialLookId}
                    onRemix={() => setShowRemixStudio(true)}
                    onPoseSelect={handleVariationSelect}
                    generationProgress={generationProgress}
                    queueCount={totalPendingCount}
                    onClose={() => setActiveTab('home')}
                  />
              </motion.div>
          )}
        </AnimatePresence>
        
        {!showRemixStudio && activeTab !== 'looks' && activeTab !== 'wardrobe' && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}

        <ProductDetail 
          products={products}
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onTryOn={handleTryOn}
          onToggleWardrobe={handleToggleWardrobe}
          isInWardrobe={!!selectedProduct && wardrobe.some(item => item.id === selectedProduct.id)}
          wishlist={wishlist}
          onToggleWishlist={handleToggleWishlist}
          onProductSelect={handleProductSelect}
        />
        
        <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        <AnimatePresence>
            {showSettings && (
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[60] bg-white"
                >
                    <Settings 
                        onClose={() => setShowSettings(false)} 
                        onOpenDashboard={() => {
                            setShowSettings(false);
                            setIsAdmin(true);
                        }} 
                    />
                </motion.div>
            )}
        </AnimatePresence>
        
        <AnimatePresence>
            {isAdmin && (
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[60] bg-white h-full w-full overflow-y-auto"
                >
                     <AdminDashboard onBack={() => {
                        setIsAdmin(false);
                        loadProducts();
                    }} />
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showRemixStudio && (
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-50 bg-white"
                >
                    <RemixStudio 
                        onClose={() => setShowRemixStudio(false)}
                        products={products}
                        wardrobe={wardrobe}
                        onCreateLook={handleRemixLook}
                        generationProgress={generationProgress}
                        queueCount={totalPendingCount}
                        onUpload={handleCustomUpload}
                    />
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default App;
