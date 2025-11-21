/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { WardrobeItem } from '../types';
import { UploadCloudIcon } from './icons';
import { Product } from '../data/products';

interface WardrobeViewProps {
    wardrobe: WardrobeItem[];
    onProductSelect: (item: WardrobeItem) => void;
}

const WardrobeView: React.FC<WardrobeViewProps> = ({ wardrobe, onProductSelect }) => {
    return (
        <div className="p-6 pb-24 max-w-2xl mx-auto w-full">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">My Wardrobe</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
                {/* Upload Placeholder */}
                <div className="flex flex-col gap-3">
                    <div className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer bg-white group">
                        <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center mb-2 transition-colors">
                            <UploadCloudIcon className="w-6 h-6 text-gray-500"/>
                        </div>
                        <span className="text-sm font-semibold text-gray-500">Add Item</span>
                    </div>
                </div>

                {wardrobe.map((item) => (
                    <div 
                        key={item.id} 
                        className="flex flex-col gap-3 group cursor-pointer"
                        onClick={() => onProductSelect(item)}
                    >
                        <div className="group relative aspect-[3/4] bg-white rounded-xl overflow-hidden border border-gray-100">
                            <img 
                                src={item.url} 
                                alt={item.name} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                        </div>
                        <p className="text-sm font-medium text-gray-800 px-1 truncate">{item.name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WardrobeView;