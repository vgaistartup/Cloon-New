
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
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });
        
    if (error) {
        console.error("Error fetching products:", error);
        throw error;
    }

    const normalizedData = (data || []).map((item: any) => {
        let finalUrls: string[] = [];

        if (Array.isArray(item.urls)) {
            finalUrls = item.urls;
        } else if (typeof item.urls === 'string') {
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
                    finalUrls = trimmed ? [trimmed] : [];
                }
            } catch (e) {
                finalUrls = item.urls.trim() ? [item.urls.trim()] : [];
            }
        } else if (item.url) {
             finalUrls = [item.url];
        }
        
        finalUrls = finalUrls.filter(u => typeof u === 'string' && u.trim() !== '');

        return {
            ...item,
            urls: finalUrls,
            url: finalUrls.length > 0 ? finalUrls[0] : item.url
        };
    });

    return normalizedData;
};

const addProduct = async (product: Product): Promise<Product> => {
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
    console.log("Attempting to delete product:", productId);

    // 1. Try to cleanup wardrobe items (Best effort). 
    // If this fails due to RLS (permissions), we ignore it and proceed to delete the product.
    // We rely on the FK constraint being dropped in the DB so step 2 succeeds regardless.
    try {
        await supabase.from('user_wardrobe').delete().eq('item_id', productId);
    } catch (e) {
        console.warn("Wardrobe cleanup skipped/failed (likely RLS), proceeding to product delete.", e);
    }

    // 2. Delete the product
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
        
    if (error) {
        console.error("Error deleting product from DB:", error);
        throw new Error(`${error.message} (Code: ${error.code})`);
    }
};

export const productService = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
};
