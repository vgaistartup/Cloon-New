
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { supabase } from '../lib/supabaseClient';
import { Look, Model, WardrobeItem } from '../types';

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

        const { data, error } = await supabase
        .from('user_models')
        .insert([{ user_id: userId, url }])
        .select()
        .single();
        
        if (error) throw error;

        return {
            id: data.id,
            url: data.url,
            userId: data.user_id,
            createdAt: new Date(data.created_at).getTime()
        };
    } catch (error) {
        console.error("Error saving model:", error);
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
     } catch (error) {
         console.error("Error fetching latest model:", error);
         return null;
     }
  },

  async saveLook(look: Omit<Look, 'id' | 'timestamp'>): Promise<Look | null> {
      try {
        const userId = await getAuthUserId();
        const { data, error } = await supabase
            .from('user_looks')
            .insert([{ 
                user_id: userId, 
                url: look.url, 
                garments: look.garments 
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
      } catch (error) {
          console.error("Error saving look:", error);
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
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            url: row.url,
            garments: row.garments,
            timestamp: new Date(row.created_at).getTime(),
            userId: row.user_id
        }));
      } catch (error) {
          console.error("Error fetching looks:", error);
          return [];
      }
  },

  async deleteLook(lookId: string): Promise<boolean> {
      try {
        const userId = await getAuthUserId();
        console.log(`[Delete Look] Attempting to delete look ${lookId} for user ${userId}`);
        
        const { error, status, statusText } = await supabase
            .from('user_looks')
            .delete()
            .eq('id', lookId)
            .eq('user_id', userId);
        
        console.log(`[Delete Look] Response: Status ${status} ${statusText}`, error);

        if (error) {
            console.error("[Delete Look] DB Error:", error);
            throw error;
        }
        
        console.log(`[Delete Look] Successfully deleted look request sent.`);
        return true;
      } catch (error) {
          console.error("[Delete Look] Exception:", error);
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
       } catch (error) {
           console.error("Error deleting model:", error);
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
        
        const payload = {
            user_id: userId,
            item_id: item.id,
            name: item.name,
            url: item.url,
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
          console.error("Error adding to wardrobe:", error.message || error);
          if (error?.code) {
               alert(`Error saving to wardrobe: ${error.message} (Code: ${error.code})`);
          }
      }
  },

  async removeFromWardrobe(itemId: string): Promise<boolean> {
      try {
        const userId = await getAuthUserId();
        console.log(`[Delete Wardrobe] Attempting to delete item ${itemId} for user ${userId}`);

        const { error, status, statusText } = await supabase
            .from('user_wardrobe')
            .delete()
            .eq('user_id', userId)
            .eq('item_id', itemId);

        console.log(`[Delete Wardrobe] Response: Status ${status} ${statusText}`, error);

        if (error) throw error;
        
        console.log("[Delete Wardrobe] Success.");
        return true;
      } catch (error) {
          console.error("[Delete Wardrobe] Error:", error);
          return false;
      }
  },

  async removeMultipleFromWardrobe(itemIds: string[]): Promise<boolean> {
    try {
        const userId = await getAuthUserId();
        console.log(`[Delete Wardrobe Batch] Items:`, itemIds, `User: ${userId}`);

        const { error, status, statusText } = await supabase
            .from('user_wardrobe')
            .delete()
            .eq('user_id', userId)
            .in('item_id', itemIds);

        console.log(`[Delete Wardrobe Batch] Response: Status ${status} ${statusText}`, error);

        if (error) throw error;
        console.log(`[Delete Wardrobe Batch] Success.`);
        return true;
    } catch (error) {
        console.error("[Delete Wardrobe Batch] Error:", error);
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
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.item_id, 
            name: row.name,
            url: row.url,
            category: row.category,
            subCategory: row.metadata?.subCategory,
            densePrompt: row.metadata?.densePrompt
        }));
      } catch (error) {
          console.error("Error fetching wardrobe:", error);
          return [];
      }
  }
};
