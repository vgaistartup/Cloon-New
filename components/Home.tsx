
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Product } from '../data/products';
import ProductCard from './ProductCard';
import { Tab } from './BottomNav';
import { Look, WardrobeItem } from '../types';
import { ArrowRightIcon, SearchIcon } from './icons';
import { motion } from 'framer-motion';

interface HomeProps {
    products: Product[];
    recentLooks: Look[];
    onProductSelect: (product: Product) => void;
    onChangeTab: (tab: Tab) => void;
    wishlist: WardrobeItem[];
    onToggleWishlist: (product: Product) => void;
    onLookSelect?: (lookId: string) => void;
}

const Home: React.FC<HomeProps> = ({ products, recentLooks, onProductSelect, onChangeTab, wishlist, onToggleWishlist, onLookSelect }) => {
    const hasLooks = recentLooks.length > 0;
    const displayLooks = recentLooks.slice(0, 3);
    
    const handleLookClick = (lookId: string) => {
        if (onLookSelect) {
            onLookSelect(lookId);
        } else {
            onChangeTab('looks');
        }
    };

    return (
        <div className="pb-24 pt-6 px-6 max-w-2xl mx-auto w-full">
            {/* New Looks Section - Bento Grid Layout */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold tracking-tight text-text-primary">New Looks</h2>
                    {hasLooks && (
                        <button 
                            onClick={() => onChangeTab('looks')}
                            className="text-sm text-text-primary font-medium hover:opacity-60 transition-opacity flex items-center gap-1"
                        >
                            See All <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div>
                    {hasLooks ? (
                        <div className="h-80 w-full flex gap-3">
                            {/* Hero Card (Newest Look) - Takes left 60% */}
                            <div 
                                key={displayLooks[0].id}
                                onClick={() => handleLookClick(displayLooks[0].id)}
                                className="flex-[1.4] relative rounded-card overflow-hidden bg-white border border-border shadow-soft hover:shadow-elevated transition-all duration-300 cursor-pointer group"
                            >
                                <img 
                                    src={displayLooks[0].url} 
                                    alt="Latest Look" 
                                    className="h-full w-full object-cover object-top mix-blend-multiply brightness-[1.03] group-hover:scale-105 transition-transform duration-700" 
                                    draggable={false}
                                />
                                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md border border-border">
                                    <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Newest</span>
                                </div>
                            </div>

                            {/* Stack Column (Right) */}
                            {displayLooks.length > 1 && (
                                <div className="flex-1 flex flex-col gap-3">
                                    {/* 2nd Look */}
                                    <div 
                                        key={displayLooks[1].id}
                                        onClick={() => handleLookClick(displayLooks[1].id)}
                                        className="flex-1 relative rounded-card overflow-hidden bg-white border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <img 
                                            src={displayLooks[1].url} 
                                            alt="Previous Look" 
                                            className="h-full w-full object-cover object-top mix-blend-multiply brightness-[1.03] group-hover:scale-105 transition-transform duration-500" 
                                            draggable={false}
                                        />
                                    </div>
                                    
                                    {/* 3rd Look or Placeholder */}
                                    {displayLooks[2] ? (
                                        <div 
                                            key={displayLooks[2].id}
                                            onClick={() => handleLookClick(displayLooks[2].id)}
                                            className="flex-1 relative rounded-card overflow-hidden bg-white border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <img 
                                                src={displayLooks[2].url} 
                                                alt="Previous Look" 
                                                className="h-full w-full object-cover object-top mix-blend-multiply brightness-[1.03] group-hover:scale-105 transition-transform duration-500" 
                                                draggable={false}
                                            />
                                        </div>
                                    ) : (
                                        // Clean Placeholder if < 3 looks
                                        <div 
                                            onClick={() => onChangeTab('looks')}
                                            className="flex-1 bg-surface-subtle rounded-card border border-border border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center">
                                                <span className="text-xs font-medium text-text-secondary">+</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-80 bg-white rounded-card shadow-soft border border-border flex flex-col items-center justify-center text-gray-400 relative z-10 group hover:border-gray-300 transition-colors">
                            <div className="w-14 h-14 bg-surface-subtle rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <SearchIcon className="w-6 h-6 text-text-secondary" />
                            </div>
                            <p className="text-lg font-medium text-text-primary">Your collection is empty</p>
                            <p className="text-sm mt-1 text-text-secondary">Start styling to build your lookbook</p>
                        </div>
                    )}
                </div>
            </section>

            {/* For You Section */}
            <section>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-6">For You</h2>
                {products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-5 gap-y-8">
                        {products.map(product => {
                            const isFavorite = wishlist.some(item => item.id === product.id);
                            return (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onProductSelect={onProductSelect} 
                                    isFavorite={isFavorite}
                                    onToggleFavorite={() => onToggleWishlist(product)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-text-secondary">No products found</p>
                        <p className="text-sm text-text-secondary opacity-60">Try adjusting your search</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Home;
