
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Product } from "./data/products";

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
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
    lookId?: string; // For pose
    poseInstruction?: string; // For pose
    timestamp: number;
}
