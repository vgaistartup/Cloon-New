/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { supabase } from '../lib/supabaseClient';
import { Look, Model, WardrobeItem } from '../types';
import { compressImage } from '../lib/utils';

// Helper to get authenticated user ID safely
const getAuthUserId = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        throw new Error("User not authenticated");
    }
    return session.user.id;
};

export const userDataService = {
  async saveModel(url: string): Promise<Model | null> {
    try {
        const userId = await getAuthUserId();
        console.log(`Saving model for user: ${userId}`);
        
        if (!url || url.length < 1000) {
            console.error("Attempted to save invalid model URL");
            return null;
        }

        // OPTIMIZATION: Compress before saving to reduce DB size
        const compressedUrl = await compressImage(url);

        const { data, error } = await supabase
        .from('user_models')
        .insert([{ user_id: userId, url: compressedUrl }])
        .select()
        .single();
        
        if (error) throw error;

        return {
            id: data.id,
            url: data.url,
            userId: data.user_id,
            createdAt: new Date(data.created_at).getTime()
        };
    } catch (error: any) {
        console.error("Error saving model:", JSON.stringify(error, null, 2));
        return null;
    }
  },

  async getLatestModel(): Promise<Model | null> {
     try {
        const userId = await getAuthUserId();
        console.log(`Fetching latest model for user: ${userId}`);

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
        return null;
     } catch (error: any) {
         console.error("Error fetching latest model:", JSON.stringify(error, null, 2));
         return null;
     }
  },

  async getAllModels(): Promise<Model[]> {
      try {
        const userId = await getAuthUserId();
        const { data, error } = await supabase
            .from('user_models')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5); 

        if (error) {
            if (error.code === '57014') {
                console.warn("Database timeout fetching models. Returning empty list to prevent crash.");
                return [];
            }
            throw error;
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            url: row.url,
            userId: row.user_id,
            createdAt: new Date(row.created_at).getTime()
        }));
      } catch (error: any) {
          console.error("Error fetching all models:", JSON.stringify(error, null, 2));
          return [];
      }
  },

  async saveLook(look: Omit<Look, 'id' | 'timestamp'>): Promise<Look | null> {
      try {
        const userId = await getAuthUserId();

        // OPTIMIZATION: Compress main look image
        const compressedLookUrl = await compressImage(look.url);

        // OPTIMIZATION: Compress any heavy base64 garment images stored in the JSON
        const optimizedGarments = await Promise.all(look.garments.map(async (g) => {
            if (g.url && g.url.startsWith('data:')) {
                return { ...g, url: await compressImage(g.url, 800) }; // Lower res for thumbnails
            }
            return g;
        }));

        const { data, error } = await supabase
            .from('user_looks')
            .insert([{ 
                user_id: userId, 
                url: compressedLookUrl, 
                garments: optimizedGarments 
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            url: data.url,
            garments: data.garments,
            timestamp: new Date(data.created_at).getTime(),
            userId: data.user_id
        };
      } catch (error: any) {
          console.error("Error saving look:", JSON.stringify(error, null, 2));
          return null;
      }
  },

  async getLooks(): Promise<Look[]> {
      try {
        const userId = await getAuthUserId();
        
        const { data, error } = await supabase
            .from('user_looks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10); 

        if (error) {
            if (error.code === '57014') {
                console.warn("Database timeout fetching looks. Returning empty list.");
                return [];
            }
            throw error;
        }

        return (data || []).map((row: any) => {
            let garments = [];
            try {
                if (typeof row.garments === 'string') {
                    garments = JSON.parse(row.garments);
                } else if (Array.isArray(row.garments)) {
                    garments = row.garments;
                }
            } catch (e) {
                console.warn("Failed to parse garments for look:", row.id);
            }

            return {
                id: row.id,
                url: row.url,
                garments: garments,
                timestamp: new Date(row.created_at).getTime(),
                userId: row.user_id
            };
        });
      } catch (error: any) {
          const msg = error.message || JSON.stringify(error, null, 2);
          console.error("Error fetching looks:", msg);
          return [];
      }
  },

  async deleteLook(lookId: string): Promise<boolean> {
      try {
        const userId = await getAuthUserId();
        
        const { error } = await supabase
            .from('user_looks')
            .delete()
            .eq('id', lookId)
            .eq('user_id', userId);
        
        if (error) throw error;
        return true;
      } catch (error: any) {
          console.error("[Delete Look] Exception:", error.message || error);
          return false;
      }
  },
  
  async deleteModel(modelId: string): Promise<void> {
       try {
          const userId = await getAuthUserId();
          const { error } = await supabase
            .from('user_models')
            .delete()
            .eq('id', modelId)
            .eq('user_id', userId);
            
            if (error) throw error;
       } catch (error: any) {
           console.error("Error deleting model:", JSON.stringify(error, null, 2));
       }
  },

  // --- Wardrobe Methods ---

  async addToWardrobe(item: WardrobeItem, category?: string): Promise<void> {
      try {
        const userId = await getAuthUserId();
        
        const { data: existing } = await supabase
            .from('user_wardrobe')
            .select('id')
            .eq('user_id', userId)
            .eq('item_id', item.id)
            .single();

        if (existing) return;

        // OPTIMIZATION: Compress item image
        const compressedUrl = await compressImage(item.url);
        
        const payload = {
            user_id: userId,
            item_id: item.id,
            name: item.name,
            url: compressedUrl,
            category: category || item.category || null,
            metadata: {
                subCategory: item.subCategory,
                densePrompt: item.densePrompt
            }
        };

        const { error } = await supabase
            .from('user_wardrobe')
            .insert([payload]);

        if (error) throw error;
      } catch (error: any) {
          console.error("Error adding to wardrobe:", error.message || JSON.stringify(error, null, 2));
      }
  },

  async removeFromWardrobe(itemId: string): Promise<boolean> {
      try {
        const userId = await getAuthUserId();

        const { error } = await supabase
            .from('user_wardrobe')
            .delete()
            .eq('user_id', userId)
            .eq('item_id', itemId);

        if (error) throw error;
        return true;
      } catch (error: any) {
          console.error("[Delete Wardrobe] Error:", JSON.stringify(error, null, 2));
          return false;
      }
  },

  async removeMultipleFromWardrobe(itemIds: string[]): Promise<boolean> {
    try {
        const userId = await getAuthUserId();

        const { error } = await supabase
            .from('user_wardrobe')
            .delete()
            .eq('user_id', userId)
            .in('item_id', itemIds);

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error("[Delete Wardrobe Batch] Error:", JSON.stringify(error, null, 2));
        return false;
    }
  },

  async getWardrobe(): Promise<WardrobeItem[]> {
      try {
        const userId = await getAuthUserId();
        
        const { data, error } = await supabase
            .from('user_wardrobe')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(24); 

        if (error) {
            if (error.code === '57014') {
                console.warn("Database timeout fetching wardrobe. Returning empty list.");
                return [];
            }
            throw error;
        }

        return (data || []).map((row: any) => ({
            id: row.item_id, 
            name: row.name,
            url: row.url,
            category: row.category,
            subCategory: row.metadata?.subCategory,
            densePrompt: row.metadata?.densePrompt
        }));
      } catch (error: any) {
          console.error("Error fetching wardrobe:", JSON.stringify(error, null, 2));
          return [];
      }
  }
};