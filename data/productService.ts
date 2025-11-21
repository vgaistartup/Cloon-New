/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { supabase } from '../lib/supabaseClient';
import { Product, mockProducts } from './products';

// This function can be used to seed the database if it's empty.
const seedDatabase = async () => {
    console.log("Checking if database needs seeding...");
    const { data, count } = await supabase.from('products').select('*', { count: 'exact', head: true });

    if (count === 0) {
        console.log("Database is empty. Seeding with mock products...");
        const { error } = await supabase.from('products').insert(mockProducts);
        if (error) {
            console.error("Error seeding database:", error);
        } else {
            console.log("Database seeded successfully.");
        }
    } else {
        console.log("Database already has data. No seeding needed.");
    }
};

const getProducts = async (): Promise<Product[]> => {
    // Optional: Seed database on first load if it's empty
    // await seedDatabase();
  
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });
        
    if (error) {
        console.error("Error fetching products:", error);
        throw error;
    }

    // Normalize data to ensure 'urls' is always a clean array
    // This fixes the "nesting brackets" issue ["[\"url\"]"] and handles schema mismatches
    const normalizedData = (data || []).map((item: any) => {
        let finalUrls: string[] = [];

        if (Array.isArray(item.urls)) {
            finalUrls = item.urls;
        } else if (typeof item.urls === 'string') {
            // Try to parse if it's a stringified array (which happens if DB col is Text but we send JSON)
            try {
                const trimmed = item.urls.trim();
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        finalUrls = parsed;
                    } else {
                        finalUrls = [trimmed];
                    }
                } else {
                    // It's just a regular URL string
                    finalUrls = trimmed ? [trimmed] : [];
                }
            } catch (e) {
                // If parsing fails, treat as single URL
                finalUrls = item.urls.trim() ? [item.urls.trim()] : [];
            }
        } else if (item.url) {
             finalUrls = [item.url];
        }
        
        // Filter out any empty strings or non-string values that might have crept in
        finalUrls = finalUrls.filter(u => typeof u === 'string' && u.trim() !== '');

        return {
            ...item,
            urls: finalUrls,
            // Ensure the main 'url' is valid for the card view
            url: finalUrls.length > 0 ? finalUrls[0] : item.url
        };
    });

    return normalizedData;
};

const addProduct = async (product: Product): Promise<Product> => {
    // Sanitize payload to ensure urls is an array
    const payload = {
        ...product,
        urls: Array.isArray(product.urls) ? product.urls : (product.url ? [product.url] : [])
    };

    const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select()
        .single();
        
    if (error) {
        console.error("Error adding product. Data sent:", payload, "Supabase error:", error);
        throw error;
    }
    return data;
};

const updateProduct = async (updatedProduct: Product): Promise<Product> => {
    // Sanitize payload to ensure urls is an array
    const payload = {
        ...updatedProduct,
        urls: Array.isArray(updatedProduct.urls) ? updatedProduct.urls : (updatedProduct.url ? [updatedProduct.url] : [])
    };

    const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', updatedProduct.id)
        .select()
        .single();
        
    if (error) {
        console.error("Error updating product. Data sent:", payload, "Supabase error:", error);
        throw error;
    }
    return data;
};

const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
        
    if (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
};

export const productService = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
};