
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ProductCategory = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory';

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  // AI Analysis Fields
  category?: string;
  subCategory?: string;
  mainColor?: string;
  densePrompt?: string; // The "Dense Visual Description"
  searchTags?: string[];
  isAnalyzing?: boolean; // UI state for background processing
}

export interface Product extends WardrobeItem {
    price: number;
    salePrice?: number;
    brand: string;
    affiliateLink: string;
    urls?: string[]; // Array for multiple product images
    category?: ProductCategory;
    subCategory?: string;
    description?: string;
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

export interface Look {
    id: string;
    url: string;
    garments: WardrobeItem[];
    timestamp: number;
    userId?: string;
}

export interface Model {
    id: string;
    url: string;
    userId: string;
    createdAt: number;
}

export type GenerationTaskType = 'try-on' | 'remix' | 'pose';

export interface GenerationTask {
    id: string;
    type: GenerationTaskType;
    items?: (Product | WardrobeItem)[]; // For try-on and remix
    lookId?: string; // For pose/vibe
    poseInstruction?: string; // For pose
    vibeInstruction?: string; // For vibe
    timestamp: number;
}
