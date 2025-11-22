
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Product } from '../data/products';
import { HeartIcon } from './icons';

interface ProductCardProps {
    product: Product;
    onProductSelect: (product: Product) => void;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductSelect, isFavorite, onToggleFavorite }) => {
    return (
        <div className="flex flex-col gap-3 group cursor-pointer" onClick={() => onProductSelect(product)}>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-white shadow-soft border border-border hover:shadow-elevated transition-shadow duration-300">
                <img 
                    src={product.url} 
                    alt={product.name} 
                    className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
                />
            </div>
            
            <div className="flex justify-between items-start px-1">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-semibold text-text-primary">{product.brand}</h3>
                    <div className="flex items-baseline gap-2">
                         {product.salePrice ? (
                            <>
                                <p className="text-sm font-medium text-red-600">${product.salePrice}</p>
                                <p className="text-xs font-medium text-text-secondary line-through opacity-60">${product.price}</p>
                            </>
                        ) : (
                            <p className="text-sm font-medium text-text-secondary">${product.price}</p>
                        )}
                    </div>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                    className={`p-1 transition-colors ${isFavorite ? 'text-black' : 'text-text-secondary hover:text-black'}`}
                    aria-label="Toggle favorite"
                >
                    <HeartIcon 
                        className={`h-5 w-5 stroke-1 ${isFavorite ? 'fill-black stroke-black' : 'fill-none'}`} 
                    />
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
