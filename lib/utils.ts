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

/**
 * Compresses an image file or Base64 string to WebP format.
 * Skips compression if the source is a remote URL (http/https).
 * 
 * @param source - File object or URL string (Data URL or Remote URL)
 * @param maxWidth - Max width for the output image (default 1536px)
 * @param quality - WebP quality 0-1 (default 0.8)
 */
export async function compressImage(source: string | File, maxWidth = 1536, quality = 0.8): Promise<string> {
    // Return early if it's a remote URL (don't convert external hosted images to base64)
    if (typeof source === 'string' && !source.startsWith('data:') && !source.startsWith('blob:')) {
        return source;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Maintain aspect ratio while resizing
            if (width > maxWidth || height > maxWidth) {
                if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context unavailable"));
                return;
            }

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Export as WebP
            // This significantly reduces size compared to raw PNG base64
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve(dataUrl);
        };

        img.onerror = (err) => reject(new Error("Failed to load image for compression"));

        if (typeof source === 'string') {
            img.src = source;
        } else {
            img.src = URL.createObjectURL(source);
        }
    });
}