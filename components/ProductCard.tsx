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
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white">
                <img 
                    src={product.url} 
                    alt={product.name} 
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
            </div>
            
            <div className="flex justify-between items-start px-1">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-medium text-gray-900">{product.brand}</h3>
                    <div className="flex items-baseline gap-2">
                         {product.salePrice ? (
                            <>
                                <p className="text-sm font-medium text-red-600">${product.salePrice}</p>
                                <p className="text-xs font-medium text-gray-400 line-through">${product.price}</p>
                            </>
                        ) : (
                            <p className="text-sm font-medium text-gray-600">${product.price}</p>
                        )}
                    </div>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                    className={`p-1 transition-colors ${isFavorite ? 'text-black' : 'text-gray-400 hover:text-black'}`}
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