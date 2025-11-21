
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

interface HomeProps {
    products: Product[];
    recentLooks: Look[];
    onProductSelect: (product: Product) => void;
    onChangeTab: (tab: Tab) => void;
    wishlist: WardrobeItem[];
    onToggleWishlist: (product: Product) => void;
}

const Home: React.FC<HomeProps> = ({ products, recentLooks, onProductSelect, onChangeTab, wishlist, onToggleWishlist }) => {
    const hasLooks = recentLooks.length > 0;

    return (
        <div className="pb-24 pt-6 px-6 max-w-2xl mx-auto w-full">
            {/* New Looks Section */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">New Looks</h2>
                    {hasLooks && (
                        <button 
                            onClick={() => onChangeTab('looks')}
                            className="text-sm text-blue-600 font-medium hover:opacity-70 transition-opacity flex items-center gap-1"
                        >
                            See All <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div 
                    onClick={() => onChangeTab('looks')}
                    className="relative h-72 w-full bg-white rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] cursor-pointer group transition-transform duration-300 active:scale-[0.98]"
                >
                    {hasLooks ? (
                        <div className="flex items-center justify-center h-full w-full relative">
                            {/* Display up to 3 overlapping images with Apple stack style */}
                            {recentLooks.slice(0, 3).map((look, index) => (
                                <div 
                                    key={look.id + index}
                                    className="absolute transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-2xl shadow-xl overflow-hidden border-[6px] border-white bg-white"
                                    style={{
                                        height: '75%',
                                        aspectRatio: '3/4',
                                        left: `calc(50% - 110px + ${index * 70}px)`,
                                        top: '12.5%',
                                        zIndex: index,
                                        transform: `rotate(${(index - 1) * 6}deg) scale(${1 - (2 - index) * 0.05}) translateY(${index === 1 ? '-10px' : '0px'})`,
                                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <img src={look.url} alt="Look" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
                            <p className="text-lg font-medium text-gray-500">Your collection is empty</p>
                            <p className="text-sm mt-1">Start styling to build your lookbook</p>
                        </div>
                    )}
                </div>
            </section>

            {/* For You Section */}
            <section>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-5">For You</h2>
                {products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-10">
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
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm">Try adjusting your search</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Home;
