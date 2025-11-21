/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';

    if (typeof error === 'object' && error !== null) {
        // Specifically look for Supabase PostgrestError structure
        if ('message' in error && typeof error.message === 'string') {
            rawMessage = error.message;
            if ('details' in error && typeof error.details === 'string' && error.details) {
                rawMessage += ` Details: ${error.details}`;
            }
        }
    } else if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string' && error) {
        rawMessage = error;
    }

    // Check for specific unsupported MIME type error from Gemini API
    if (rawMessage.includes("Unsupported MIME type")) {
        return `Unsupported file format. Please upload an image format like PNG, JPEG, or WEBP.`;
    }
    
    // Clean up Supabase-specific error prefixes for better readability
    if (rawMessage.startsWith('PostgrestError: ')) {
        rawMessage = rawMessage.substring('PostgrestError: '.length);
    }
    
    return `${context}. ${rawMessage}`;
}
