
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const getUserId = (): string => {
  try {
    let userId = localStorage.getItem('cloon_user_id');
    if (!userId) {
      // Fallback for environments without crypto.randomUUID (e.g. insecure http context or older browsers)
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
         userId = crypto.randomUUID();
      } else {
         // Simple fallback UUID generator
         userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
      }
      localStorage.setItem('cloon_user_id', userId);
    }
    return userId;
  } catch (e) {
    console.error("Error accessing localStorage for User ID:", e);
    // Return a temp session ID if storage fails entirely
    return 'temp_session_' + Math.random().toString(36).substring(2);
  }
};
