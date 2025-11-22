
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { HomeIcon, ShoppingBagIcon, GridIcon } from './icons';

export type Tab = 'home' | 'wardrobe' | 'looks';

interface BottomNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-border pb-safe pt-2 px-6">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                <button 
                    onClick={() => onTabChange('home')}
                    className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeTab === 'home' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label="Home"
                >
                    <HomeIcon className={`w-6 h-6 ${activeTab === 'home' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                    <span className="text-[10px] font-medium">Home</span>
                </button>
                <button 
                    onClick={() => onTabChange('wardrobe')}
                    className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeTab === 'wardrobe' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label="Wardrobe"
                >
                    <ShoppingBagIcon className={`w-6 h-6 ${activeTab === 'wardrobe' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                    <span className="text-[10px] font-medium">Wardrobe</span>
                </button>
                <button 
                    onClick={() => onTabChange('looks')}
                    className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${activeTab === 'looks' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label="Looks"
                >
                    <GridIcon className={`w-6 h-6 ${activeTab === 'looks' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                    <span className="text-[10px] font-medium">Looks</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
