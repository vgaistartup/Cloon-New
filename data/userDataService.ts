
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { supabase } from '../lib/supabaseClient';
import { Look, Model, WardrobeItem } from '../types';
import { getUserId } from '../lib/user';

export const userDataService = {
  async saveModel(url: string): Promise<Model | null> {
    const userId = getUserId();
    console.log(`Saving model for user: ${userId}. Image length: ${url.length}`);
    
    // Basic validation to ensure we aren't saving empty or truncated data
    if (!url || url.length < 1000) {
        console.error("Attempted to save invalid model URL");
        return null;
    }

    const { data, error } = await supabase
      .from('user_models')
      .insert([{ user_id: userId, url }])
      .select()
      .single();
    
    if (error) {
        console.error("Error saving model:", JSON.stringify(error, null, 2));
        return null;
    }
    return {
        id: data.id,
        url: data.url,
        userId: data.user_id,
        createdAt: new Date(data.created_at).getTime()
    };
  },

  async getLatestModel(): Promise<Model | null> {
     const userId = getUserId();
     console.log(`Fetching latest model for user: ${userId}`);

     // 1. Try to fetch specifically for this user
     const { data, error } = await supabase
      .from('user_models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

     if (data) {
         return {
            id: data.id,
            url: data.url,
            userId: data.user_id,
            createdAt: new Date(data.created_at).getTime()
         };
     }

     // 2. FALLBACK: If no model found for this specific user ID (common in dev environments 
     // where localStorage is wiped on refresh), fetch the absolute latest model from the DB.
     // This ensures the user sees *something* they likely just created.
     console.log("No model found for current User ID. Attempting global fallback...");
     
     const { data: fallbackData, error: fallbackError } = await supabase
      .from('user_models')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

     if (fallbackData) {
         console.log("Found fallback model.");
         return {
            id: fallbackData.id,
            url: fallbackData.url,
            userId: fallbackData.user_id,
            createdAt: new Date(fallbackData.created_at).getTime()
         };
     }

     if (error && error.code !== 'PGRST116') {
         console.error("Error fetching model:", JSON.stringify(error, null, 2));
     }
     
     return null;
  },

  async saveLook(look: Omit<Look, 'id' | 'timestamp'>): Promise<Look | null> {
      const userId = getUserId();
      const { data, error } = await supabase
        .from('user_looks')
        .insert([{ 
            user_id: userId, 
            url: look.url, 
            garments: look.garments 
        }])
        .select()
        .single();

      if (error) {
          console.error("Error saving look:", JSON.stringify(error, null, 2));
          return null;
      }

      return {
          id: data.id,
          url: data.url,
          garments: data.garments,
          timestamp: new Date(data.created_at).getTime(),
          userId: data.user_id
      };
  },

  async getLooks(): Promise<Look[]> {
      const userId = getUserId();
      
      // 1. Try fetching by User ID
      let { data, error } = await supabase
        .from('user_looks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // 2. FALLBACK: If empty, fetch global latest looks (limit 20 for performance)
      if (!data || data.length === 0) {
           console.log("No looks for user. Fetching global fallback...");
           const fallback = await supabase
            .from('user_looks')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
           
           if (fallback.data) {
               data = fallback.data;
           }
      }

      if (error) {
          console.error("Error fetching looks:", JSON.stringify(error, null, 2));
          return [];
      }

      return (data || []).map((row: any) => ({
          id: row.id,
          url: row.url,
          garments: row.garments,
          timestamp: new Date(row.created_at).getTime(),
          userId: row.user_id
      }));
  },

  async deleteLook(lookId: string): Promise<boolean> {
      console.log("userDataService: Requesting delete for look ID:", lookId);
      
      const { error, count } = await supabase
          .from('user_looks')
          .delete({ count: 'exact' })
          .eq('id', lookId);
      
      if (error) {
          console.error("Error deleting look from DB:", JSON.stringify(error, null, 2));
          return false;
      }
      
      if (count === 0) {
          console.warn(`Delete operation completed but 0 rows were deleted. ID '${lookId}' might not exist or RLS blocked it.`);
          return false;
      } else {
          console.log(`Successfully deleted ${count} row(s) for ID: ${lookId}`);
          return true;
      }
  },
  
  async deleteModel(modelId: string): Promise<void> {
       const { error } = await supabase
          .from('user_models')
          .delete()
          .eq('id', modelId);
          
      if (error) {
          console.error("Error deleting model:", JSON.stringify(error, null, 2));
          throw error;
      }
  },

  // --- Wardrobe Methods ---

  async addToWardrobe(item: WardrobeItem, category?: string): Promise<void> {
      const userId = getUserId();
      
      // Prevent duplicates based on item_id for this user
      const { data: existing } = await supabase
          .from('user_wardrobe')
          .select('id')
          .eq('user_id', userId)
          .eq('item_id', item.id)
          .single();

      if (existing) {
          console.log("Item already exists in wardrobe, skipping.");
          return;
      }

      const { error } = await supabase
          .from('user_wardrobe')
          .insert([{
              user_id: userId,
              item_id: item.id,
              name: item.name,
              url: item.url,
              category: category || null
          }]);

      if (error) {
          console.error("Error adding to wardrobe:", error);
      }
  },

  async removeFromWardrobe(itemId: string): Promise<void> {
      const userId = getUserId();
      const { error } = await supabase
          .from('user_wardrobe')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', itemId);

      if (error) {
          console.error("Error removing from wardrobe:", error);
      }
  },

  async removeMultipleFromWardrobe(itemIds: string[]): Promise<void> {
    const userId = getUserId();
    const { error } = await supabase
        .from('user_wardrobe')
        .delete()
        .eq('user_id', userId)
        .in('item_id', itemIds);

    if (error) {
        console.error("Error batch removing from wardrobe:", error);
    }
  },

  async getWardrobe(): Promise<WardrobeItem[]> {
      const userId = getUserId();
      
      // Fetch user specific wardrobe
      let { data, error } = await supabase
          .from('user_wardrobe')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
           console.log("Wardrobe empty for user, attempting global fallback for demo experience.");
           const fallback = await supabase
            .from('user_wardrobe')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
           
           if (fallback.data && fallback.data.length > 0) {
               data = fallback.data;
           }
      }

      if (error) {
          console.error("Error fetching wardrobe:", error);
          return [];
      }

      return (data || []).map((row: any) => ({
          id: row.item_id, // Map database item_id back to application id
          name: row.name,
          url: row.url
      }));
  }
};
