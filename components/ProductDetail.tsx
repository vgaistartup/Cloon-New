
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useState } from 'react';
import { Product } from '../data/products';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ArrowUpSquareIcon, ArrowUpRightIcon, HeartIcon } from './icons';
import ProductCard from './ProductCard';
import { WardrobeItem } from '../types';

interface ProductDetailProps {
    products: Product[];
    product: Product | null;
    onClose: () => void;
    onTryOn: (product: Product) => void;
    onToggleWardrobe: (product: Product) => void;
    isInWardrobe: boolean;
    wishlist: WardrobeItem[];
    onToggleWishlist: (product: Product) => void;
    onProductSelect: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ products, product, onClose, onTryOn, onToggleWardrobe, isInWardrobe, wishlist, onToggleWishlist, onProductSelect }) => {
    const imageScrollRef = useRef<HTMLDivElement>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const handleScroll = () => {
        if (imageScrollRef.current) {
            const scrollLeft = imageScrollRef.current.scrollLeft;
            const width = imageScrollRef.current.clientWidth;
            const index = Math.round(scrollLeft / width);
            setActiveImageIndex(index);
        }
    };

    const handleShare = async () => {
        if (!product) return;
        
        const shareUrl = window.location.href;
        const isValidUrl = shareUrl.startsWith('http');

        if (isValidUrl && navigator.share) {
            try {
                await navigator.share({
                    title: `${product.brand} - ${product.name}`,
                    text: `Check out this ${product.name} from ${product.brand} on Cloon!`,
                    url: shareUrl, 
                });
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback to clipboard if share fails/cancelled
                copyToClipboard(shareUrl);
            }
        } else {
            // Fallback if sharing not supported or invalid URL scheme
            copyToClipboard(shareUrl);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Could not copy link.');
        }
    };
    
    // Safely derive data. If product is null, these will be empty, preventing crashes before AnimatePresence handles the exit.
    const similarItems = product ? products.filter(p => p.id !== product.id).slice(0, 4) : [];
    const images = product ? (product.urls && product.urls.length > 0 ? product.urls : [product.url]) : [];

    return (
        <AnimatePresence>
            {product && (
                <motion.div
                    className="fixed inset-0 z-50 bg-white flex flex-col"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                    <div className="flex-grow overflow-y-auto scrollbar-hide pb-32">
                        {/* Header */}
                        <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center">
                            <button onClick={onClose} className="p-2 bg-white/60 backdrop-blur-md rounded-full shadow-soft hover:bg-white transition-colors">
                                <ChevronLeftIcon className="w-6 h-6 text-text-primary" />
                            </button>
                            <div className="flex items-center justify-center px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded-full">
                                {activeImageIndex + 1} / {images.length}
                            </div>
                        </header>

                        {/* Image Carousel */}
                        <div 
                            ref={imageScrollRef}
                            onScroll={handleScroll}
                            className="w-full aspect-[3/4] bg-white snap-x snap-mandatory overflow-x-auto flex scrollbar-hide"
                        >
                            {images.map((url, index) => (
                                <div key={index} className="w-full h-full flex-shrink-0 snap-center">
                                    <img src={url} alt={`${product.name} view ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>

                        {/* Product Info */}
                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <a href="#" className="text-xl font-bold text-text-primary tracking-tight">{product.brand}</a>
                                    <p className="text-base text-text-secondary mt-1">{product.name}</p>
                                </div>
                                <button onClick={handleShare} className="p-2">
                                    <ArrowUpSquareIcon className="w-6 h-6 text-text-secondary hover:text-text-primary transition-colors" />
                                </button>
                            </div>

                            <a href={product.affiliateLink} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center py-4 border-y border-border">
                                <span className="text-base font-medium text-text-primary">SSENSE</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-medium text-text-primary">${product.salePrice ?? product.price}</span>
                                    <ArrowUpRightIcon className="w-5 h-5 text-text-secondary" />
                                </div>
                            </a>

                            {/* Similar Items */}
                            <div>
                                <h3 className="text-lg font-bold text-text-primary mb-5">Similar Items</h3>
                                <div className="grid grid-cols-2 gap-x-5 gap-y-8">
                                    {similarItems.map(item => (
                                        <ProductCard
                                            key={item.id}
                                            product={item}
                                            onProductSelect={onProductSelect} 
                                            isFavorite={wishlist.some(w => w.id === item.id)}
                                            onToggleFavorite={() => onToggleWishlist(item)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Sticky Footer Actions */}
                    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-xl border-t border-border p-4">
                        <div className="flex items-center gap-4 max-w-lg mx-auto">
                            <button
                                onClick={() => onToggleWardrobe(product)}
                                className={`w-1/2 flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold rounded-btn transition-colors border border-transparent ${
                                    isInWardrobe ? 'bg-surface-subtle text-text-primary border-border' : 'bg-surface-subtle text-text-primary hover:bg-gray-100'
                                }`}
                            >
                                <HeartIcon className={`w-5 h-5 ${isInWardrobe ? 'fill-black stroke-black' : 'fill-none'}`} />
                                {isInWardrobe ? 'Saved' : 'Save'}
                            </button>
                            <button
                                onClick={() => onTryOn(product)}
                                className="w-1/2 px-6 py-4 text-base font-semibold text-white bg-black rounded-btn shadow-elevated hover:bg-gray-900 transition-colors"
                            >
                                Try On
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ProductDetail;
