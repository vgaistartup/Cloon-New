/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Product } from "../types";

/**
 * Generates a vector embedding for the given text using Gemini.
 * @deprecated Vector search has been disabled.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  return [];
};

/**
 * Adds a product to Supabase with its vector embedding.
 * @deprecated Vector search has been disabled.
 */
export const addProductWithEmbedding = async (
  productData: Omit<Product, "id" | "url" | "urls">,
  imageUrl: string
): Promise<Product | null> => {
  return null;
};

/**
 * Searches for products using semantic similarity with fallback to text search.
 * @deprecated Vector search has been disabled.
 */
export const searchProducts = async (
  userQuery: string,
  matchThreshold = 0.5,
  matchCount = 10
): Promise<Product[]> => {
  return [];
};