
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, analyzeOutfitStyle, generateCompleteLook } from './services/geminiService';
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
import { getUserId } from './lib/user';
import RemixStudio from './components/RemixStudio';

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

  // Check for API Key Selection on Mount
  useEffect(() => {
      const checkApiKey = async () => {
          if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
              const hasKey = await (window as any).aistudio.hasSelectedApiKey();
              setHasApiKey(hasKey);
          } else {
              // Fallback for environments without the wrapper (e.g., local dev)
              // Assume env var is present or handled elsewhere.
              setHasApiKey(true);
          }
      };
      checkApiKey();
  }, []);

  const handleConnectApiKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          setHasApiKey(true);
      }
  };

  // Ref to track active saved looks for race-condition prevention
  const savedLooksRef = useRef<Look[]>([]);
  useEffect(() => {
      savedLooksRef.current = savedLooks;
  }, [savedLooks]);

  // Derived state for the UI to show total pending items
  const totalPendingCount = generationQueue.length + (isProcessingQueue ? 1 : 0);

  const loadProducts = useCallback(async () => {
      try {
        const fetchedProducts = await productService.getProducts();
        setProducts(fetchedProducts);
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err, "Failed to load products from the database"));
      }
  }, []);

  const loadUserData = useCallback(async () => {
      const userId = getUserId();
      console.log("Loading data for UserID:", userId);
      
      try {
          // Fetch model, looks, and wardrobe in parallel
          const [model, dbLooks, dbWardrobe] = await Promise.all([
              userDataService.getLatestModel(),
              userDataService.getLooks(),
              userDataService.getWardrobe()
          ]);
          
          let initialLooks: Look[] = [];

          if (model) {
              console.log("Found saved model:", model.id);
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
          } else {
              console.log("No saved model found.");
          }

          // Merge base model with saved looks and sort strictly by timestamp descending
          const combinedLooks = [...initialLooks, ...dbLooks].sort((a, b) => b.timestamp - a.timestamp);
          
          setSavedLooks(combinedLooks);
          setWardrobe(dbWardrobe);

      } catch (err) {
          console.error("Failed to load user data:", err);
      }
  }, []);

  // Initial Load
  useEffect(() => {
    if (hasApiKey) {
        loadProducts();
        loadUserData();
    
        const timer = setTimeout(() => {
          setShowSplash(false);
        }, 1500);
    
        return () => clearTimeout(timer);
    }
  }, [loadProducts, loadUserData, hasApiKey]);

  // Refresh User Data when switching to Looks or Wardrobe tab
  useEffect(() => {
    if (hasApiKey && (activeTab === 'looks' || activeTab === 'wardrobe')) {
      loadUserData();
    }
  }, [activeTab, loadUserData, hasApiKey]);

  // Filter products based on search query
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
        userId: getUserId()
    };
    // Add to front as it is newest
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
        setGenerationQueue([]); // Clear queue on reset
  };

  // Robust file loader that uses Canvas to bypass CORS opacity issues
  const fetchFileFromUrl = async (url: string, name: string): Promise<File> => {
      return new Promise((resolve, reject) => {
          const image = new Image();
          image.setAttribute('crossOrigin', 'anonymous');
          image.src = url;

          image.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                  reject(new Error('Could not create canvas context'));
                  return;
              }
              ctx.drawImage(image, 0, 0);
              canvas.toBlob((blob) => {
                  if (!blob) {
                      reject(new Error('Canvas toBlob failed'));
                      return;
                  }
                  resolve(new File([blob], name, { type: blob.type }));
              }, 'image/png');
          };

          image.onerror = (e) => {
             console.warn("Canvas load failed, falling back to fetch", e);
             // Fallback to original fetch if canvas fails (e.g. very strict CORS)
             fetch(url)
                .then(res => res.blob())
                .then(blob => resolve(new File([blob], name, { type: blob.type })))
                .catch(err => {
                     console.warn("Fetch failed, using placeholder");
                     // Create a 1x1 transparent PNG as a safe fallback to prevent crash
                     const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                     const byteCharacters = atob(base64);
                     const byteNumbers = new Array(byteCharacters.length);
                     for (let i = 0; i < byteCharacters.length; i++) {
                         byteNumbers[i] = byteCharacters.charCodeAt(i);
                     }
                     const byteArray = new Uint8Array(byteNumbers);
                     const blob = new Blob([byteArray], { type: "image/png" });
                     resolve(new File([blob], name || "placeholder.png", { type: "image/png" }));
                });
          };
      });
  };

  // --- Queue Processing Logic ---

  useEffect(() => {
    const processNext = async () => {
        if (isProcessingQueue || generationQueue.length === 0) return;

        setIsProcessingQueue(true);
        const currentTask = generationQueue[0];

        try {
            await executeTask(currentTask);
        } catch (err) {
            console.error("Task failed:", err);
            // Optionally set error state here, but we usually want to continue the queue
        } finally {
            // Remove the finished task from queue
            setGenerationQueue(prev => prev.slice(1));
            setIsProcessingQueue(false);
        }
    };

    if (hasApiKey) {
        processNext();
    }
  }, [generationQueue, isProcessingQueue, modelImageUrl, hasApiKey]);

  const executeTask = async (task: GenerationTask) => {
      if (!modelImageUrl) {
          console.warn("Queue: No base model available. Skipping task.");
          return;
      }

      // Start fake progress for visual feedback of the active item
      setGenerationProgress(5);
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
            if (prev >= 90) return prev; 
            return prev + Math.random() * 6 + 2;
        });
      }, 400);

      try {
          let newImageUrl = '';
          let finalLookId = '';

          if (task.type === 'try-on' || task.type === 'remix') {
               const items = task.items || [];
               const files = await Promise.all(items.map(async item => {
                    const imageUrlToFetch = (item as Product).urls?.[0] ?? item.url;
                    return await fetchFileFromUrl(imageUrlToFetch, item.name);
               }));
               
               if (task.type === 'try-on') {
                   // Single item try-on
                   newImageUrl = await generateVirtualTryOnImage(modelImageUrl, files[0]);
               } else {
                   // Multi-item remix
                   newImageUrl = await generateCompleteLook(modelImageUrl, files);
               }

                const tempLookId = `look-${Date.now()}`;
                const newLook: Look = {
                        id: tempLookId,
                        url: newImageUrl,
                        garments: items.map(i => ({ id: i.id, name: i.name, url: i.url })),
                        timestamp: Date.now(),
                        userId: getUserId()
                };

                // Optimistic update
                setSavedLooks(prev => [newLook, ...prev]);

                // Persist to DB
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
                    finalLookId = savedLookData.id;
                } else {
                    finalLookId = tempLookId;
                }

          } else if (task.type === 'pose') {
               const targetLook = savedLooksRef.current.find(l => l.id === task.lookId);
               if (!targetLook || !task.poseInstruction) {
                   throw new Error("Invalid pose task data");
               }

               newImageUrl = await generatePoseVariation(targetLook.url, task.poseInstruction);
               const tempLookId = `look-${Date.now()}`;

               const newLook: Look = {
                    id: tempLookId,
                    url: newImageUrl,
                    garments: targetLook.garments,
                    timestamp: Date.now(),
                    userId: getUserId()
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
                    finalLookId = savedLookData.id;
                } else {
                    finalLookId = tempLookId;
                }
          }

          setGenerationProgress(100);
          
          // Switch tab only if this was the last item in queue or user isn't doing something else
          if (generationQueue.length === 1) { // 1 because we haven't shifted yet
               // Optional: Auto-switch logic could be refined
          }

      } catch (err: any) {
          console.error("Queue Task Execution Error:", err);
          setError(getFriendlyErrorMessage(err, "Generation failed."));
      } finally {
          clearInterval(progressInterval);
          // Small delay before clearing progress to allow animation to complete
          setTimeout(() => {
              setGenerationProgress(0);
          }, 500);
      }
  };


  // --- Event Handlers (Queue Pushers) ---

  const handleTryOn = (item: Product | WardrobeItem) => {
      setSelectedProduct(null); // Close detail view
      
      const newTask: GenerationTask = {
          id: `task-${Date.now()}`,
          type: 'try-on',
          items: [item],
          timestamp: Date.now()
      };
      
      setGenerationQueue(prev => [...prev, newTask]);
  };

  const handleRemixLook = (items: (Product | WardrobeItem)[]) => {
      // Validate base model exists
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
      setShowRemixStudio(false); // Close studio immediately so user can see queue progress
      setActiveTab('looks'); // Move to looks tab to see progress
  };

  const handlePoseSelect = (lookId: string, poseInstruction: string) => {
      const newTask: GenerationTask = {
          id: `task-${Date.now()}`,
          type: 'pose',
          lookId,
          poseInstruction,
          timestamp: Date.now()
      };
      setGenerationQueue(prev => [...prev, newTask]);
  };
  
  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => prev.some(item => item.id === product.id) ? prev.filter(item => item.id !== product.id) : [...prev, product]);
  };

  const handleToggleWardrobe = async (product: Product) => {
    const exists = wardrobe.some(item => item.id === product.id);
    
    // Optimistic Update
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
      // Optimistic Update
      setWardrobe(prev => prev.filter(item => !itemIds.includes(item.id)));
      
      try {
          await userDataService.removeMultipleFromWardrobe(itemIds);
      } catch (err) {
          console.error("Failed to delete items from wardrobe:", err);
          // Revert on failure (optional, but good practice. For now we assume success for speed)
      }
  };
  
  const handleCustomUpload = async (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
          const base64Url = e.target?.result as string;
          const newItem: WardrobeItem = {
              id: `custom-${Date.now()}`,
              name: file.name,
              url: base64Url
          };
          
          setWardrobe(prev => [newItem, ...prev]);
          await userDataService.addToWardrobe(newItem, 'custom');
      };
      reader.readAsDataURL(file);
  };

  const handleProductSelect = (item: Product | WardrobeItem) => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      setSelectedProduct(product);
    }
  };
  
  const handleDeleteLook = async (lookId: string) => {
        console.log("App: Deleting Look ID:", lookId);
        
        // 1. Optimistic update: Remove from UI immediately
        setSavedLooks(prev => prev.filter(l => l.id !== lookId));
        
        try {
            // 2. Check if it's a persistent DB ID
            // If it starts with 'look-', it hasn't been saved to DB yet (or failed to save).
            if (!lookId.startsWith('model-base-') && !lookId.startsWith('temp-base-') && !lookId.startsWith('look-')) {
                const success = await userDataService.deleteLook(lookId);
                if (!success) {
                    console.warn(`App: deleteLook returned false for ID: ${lookId}`);
                }
            } else {
                console.warn("App: Skipping DB delete for temporary/base ID:", lookId);
            }
        } catch (err) {
            console.error("Failed to delete look from DB:", err);
            setError("Could not delete look completely. Please refresh.");
        }
  };

  const handleLookSelect = (lookId: string) => {
      setInitialLookId(lookId);
      setActiveTab('looks');
  };

  const handleResetInitialLookId = useCallback(() => {
    setInitialLookId(null);
  }, []);

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
      
      <div className="font-sans h-[100dvh] w-screen bg-white overflow-hidden flex flex-col text-[#1D1D1F]">
        {/* Header for standard pages - hide global header when on Wardrobe/Looks/Remix tabs to use custom ones */}
        {activeTab !== 'looks' && activeTab !== 'wardrobe' && !showRemixStudio && (
            <Header 
                onOpenSettings={() => setShowSettings(true)} 
                onSearch={setSearchQuery} 
                onOpenChat={() => setIsChatOpen(true)} 
                generationProgress={generationProgress}
                queueCount={totalPendingCount}
            />
        )}
        
        {/* Main Content Area */}
        <main className={`flex-grow flex flex-col overflow-y-auto scrollbar-hide`}>
          {activeTab === 'home' && <Home products={filteredProducts} recentLooks={savedLooks} onProductSelect={handleProductSelect} onChangeTab={setActiveTab} wishlist={wishlist} onToggleWishlist={handleToggleWishlist} onLookSelect={handleLookSelect} />}
        </main>
        
        {/* Wardrobe Overlay with Slide Animation */}
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
                  />
              </motion.div>
          )}
        </AnimatePresence>

        {/* MyLooks Overlay with Slide Animation */}
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
                    onPoseSelect={handlePoseSelect}
                    generationProgress={generationProgress}
                    queueCount={totalPendingCount}
                    onClose={() => setActiveTab('home')}
                  />
              </motion.div>
          )}
        </AnimatePresence>
        
        {/* Bottom Navigation - Hidden when Looks, Wardrobe or Remix is active */}
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
        
        {/* Admin Dashboard Overlay */}
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
                    />
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default App;
