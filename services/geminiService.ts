
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Chat, Type } from "@google/genai";
import { WardrobeItem } from "../types";

// Models Configuration
const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash-image';

// Helper: Resize image to max dimension (e.g. 1024px) to optimize API latency
const resizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            const maxDim = 1024;
            let width = img.width;
            let height = img.height;

            // Only resize if larger than maxDim
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            } 
            // Even if small enough, we re-compress to JPEG to ensure low payload size
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            
            // Fill white background to handle transparent PNGs (Pro model prefers solid backgrounds)
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    // Force convert to JPEG with 0.85 quality for optimal balance of size/quality
                    resolve(new File([blob], "optimized_image.jpg", { type: "image/jpeg" }));
                } else {
                    reject(new Error("Image resizing failed"));
                }
            }, "image/jpeg", 0.85); 
        };
        
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image for resizing"));
        };
        
        img.src = url;
    });
};

const fileToPart = async (file: File) => {
    const resizedFile = await resizeImage(file);
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(resizedFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

// Helper to handle fallback logic
// 1. Try Primary Model
// 2. If error or timeout, Try Fallback Model
const generateWithFallback = async (
    contents: any, 
    config: any, 
    logContext: string
): Promise<string> => {
    const apiKey = process.env.API_KEY;
    // Safety check for API key availability
    if (!apiKey) {
        throw new Error("API Key not found. Please connect your Google account.");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        console.log(`[Gemini Service] ${logContext} - Attempting with ${PRIMARY_MODEL}...`);
        
        // Race condition: If model takes > 50s, assume stuck/cancelled and trigger fallback manually
        const response = await Promise.race([
            ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents,
                config
            }),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Primary model timeout")), 50000)
            )
        ]);

        console.log(`[Gemini Service] ${logContext} - Success with ${PRIMARY_MODEL}`);
        return handleApiResponse(response as GenerateContentResponse);

    } catch (error: any) {
        console.warn(`[Gemini Service] ${logContext} - Primary model failed: ${error.message}. Switching to fallback ${FALLBACK_MODEL}.`);
        
        try {
            const fallbackResponse = await ai.models.generateContent({
                model: FALLBACK_MODEL,
                contents,
                config
            });
            
            console.log(`[Gemini Service] ${logContext} - Success with ${FALLBACK_MODEL}`);
            return handleApiResponse(fallbackResponse);
        } catch (fallbackError: any) {
            console.error(`[Gemini Service] ${logContext} - Fallback model also failed: ${fallbackError.message}`);
            // Return details of the fallback error, but also log the primary error
            throw fallbackError;
        }
    }
};

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "Create a high-fashion model photo of this person. Full body shot. Standing in a confident, relaxed pose. Background: PURE WHITE #FFFFFF. Soft, studio lighting. Preserve facial features exactly.";
    
    return generateWithFallback(
        { parts: [userImagePart, { text: prompt }] },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateModelImage"
    );
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    // Pro Model Prompt Strategy: Persona + Explicit Constraints
    const contentsParts = [
        { text: "You are an expert digital fashion editor." },
        { text: "REFERENCE MODEL (Preserve Identity & Body Shape):" },
        modelImagePart,
        { text: "TARGET GARMENT (Warp & Fit to Model):" },
        garmentImagePart,
        { text: `
        TASK: Generate a photorealistic image of the Reference Model wearing the Target Garment.

        CRITICAL INSTRUCTIONS:
        1. IDENTITY PRESERVATION: The face, hair, and body shape MUST be identical to the Reference Model.
        2. OUTFIT SWAP: Completely replace the original outfit with the Target Garment.
        3. FIT & DRAPE: The new garment should fit naturally, following the model's pose and body curves.
        4. BACKGROUND: Pure White (#FFFFFF). No shadows.
        
        Return ONLY the generated image.
        ` }
    ];
    
    return generateWithFallback(
        { parts: contentsParts },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateVirtualTryOnImage"
    );
};

// Helper to analyze a garment and generate a description + category classification
const generateItemDescription = async (file: File): Promise<{ category: 'Major' | 'Minor', description: string, file: File }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const imagePart = await fileToPart(file);
    
    const prompt = `
    Analyze this fashion item. 
    1. Classify it as "Major" if it is a Top, Bottom, Dress, Jacket, Coat, Suit, or Pants.
    2. Classify it as "Minor" if it is Shoes, Sneakers, Boots, Sandals, Hat, Belt, Bag, Scarf, Glasses, or Jewelry.
    3. Provide a highly detailed visual description (color, material, texture) in less than 40 words.
    
    Return JSON: { "category": "Major" | "Minor", "description": "string" }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use Flash for text analysis as it's faster and sufficient
            contents: { parts: [imagePart, { text: prompt }] },
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: ["Major", "Minor"] },
                        description: { type: Type.STRING }
                    },
                    required: ["category", "description"]
                }
            }
        });

        const text = response.text || "{}";
        const json = JSON.parse(text);
        return {
            category: json.category || 'Major',
            description: json.description || 'A fashion item',
            file: file
        };
    } catch (e) {
        console.warn("Failed to analyze item description, defaulting to Major.", e);
        return { category: 'Major', description: '', file };
    }
};

export const analyzeWardrobeItem = async (file: File): Promise<Partial<WardrobeItem>> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await fileToPart(file);

    const prompt = `
    TASK:
    1. Detect the main clothing item in the image.
    2. Categorize it (Top, Bottom, FullBody, Footwear, Accessory).
    3. Extract specific attributes (Color, Fabric, Fit, Neckline, Pattern).
    4. Write a "Dense Visual Description". This is CRITICAL. It must describe the texture, weight, how light hits it, and the cut, so that an image generation model can recreate it perfectly later.

    OUTPUT FORMAT (Strict JSON):
    {
      "item_detected": true, 
      "category": "Top" | "Bottom" | "FullBody" | "Footwear" | "Accessory",
      "sub_category": "string",
      "main_color": "string",
      "attributes": {
        "fabric_texture": "string",
        "pattern": "string",
        "fit_type": "string",
        "neckline": "string",
        "sleeve_length": "string"
      },
      "search_tags": ["string", "string"], 
      "dense_generation_prompt": "string" 
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text?.trim() || "{}";
        const json = JSON.parse(text);
        
        if (json.item_detected === false) {
             return { name: "Unknown Item" };
        }

        return {
            name: json.sub_category || "New Item",
            category: json.category ? json.category.toLowerCase() : 'top',
            subCategory: json.sub_category,
            mainColor: json.main_color,
            densePrompt: json.dense_generation_prompt,
            searchTags: json.search_tags
        };
    } catch (err) {
        console.error("Failed to analyze wardrobe item:", err);
        // Fallback to basic info
        return { name: file.name };
    }
};

export const generateCompleteLook = async (modelImageUrl: string, garmentImages: File[]): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    
    // Step 1: Hybrid Analysis
    const analyzedItems = await Promise.all(garmentImages.map(generateItemDescription));
    
    const majorItems = analyzedItems.filter(i => i.category === 'Major');
    const minorItems = analyzedItems.filter(i => i.category === 'Minor');
    
    // Prepare Major Items as Image Parts
    const majorItemParts = await Promise.all(majorItems.map(item => fileToPart(item.file)));
    
    // Prepare Minor Items as Text Descriptions
    const minorItemDescriptions = minorItems.map(item => item.description).join(". Also wearing ");
    
    const contentsParts: any[] = [
        { text: "You are an expert digital stylist." },
        { text: "REFERENCE MODEL:" },
        modelImagePart
    ];

    if (majorItemParts.length > 0) {
        contentsParts.push({ text: "PRIMARY CLOTHING (Composite these textures onto model):" });
        contentsParts.push(...majorItemParts);
    }

    contentsParts.push({ text: `
        TASK: Create a coherent full-body fashion look.
        
        INSTRUCTIONS:
        1. Apply the PRIMARY CLOTHING items to the model.
        2. ${minorItemDescriptions ? `Include these ACCESSORIES: ${minorItemDescriptions}.` : ''}
        3. Ensure the face and body match the REFERENCE MODEL exactly.
        4. Background: Pure White (#FFFFFF).
        
        Return ONLY the final image.
    `});
    
    return generateWithFallback(
        { parts: contentsParts },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateCompleteLook"
    );
};

// Merged functionality for Pose and Vibe variations
export const generateLookVariation = async (
    referenceImageUrl: string, 
    config: { pose?: string, vibe?: string }
): Promise<string> => {
    const referenceImagePart = dataUrlToPart(referenceImageUrl);
    
    const poseInstruction = config.pose || "Maintain the current pose exactly.";
    const vibeInstruction = config.vibe || "isolated on a pure white background, soft even studio lighting.";

    // Logic to inject specific material physics instructions based on the Vibe keyword
    let materialLogic = "";
    if (config.vibe?.toLowerCase().includes("tokyo")) {
        materialLogic = "MATERIAL PHYSICS: If the outfit contains Leather, Plastic, or Satin, render distinct neon reflections (pink/blue) on the surface. If Cotton or Wool, simulate soft ambient light absorption. Wet ground reflections must match the shoe color.";
    } else if (config.vibe?.toLowerCase().includes("golden")) {
        materialLogic = "MATERIAL PHYSICS: Add strong warm backlighting (rim light) to hair and shoulders. Translucent fabrics should glow slightly. Shadows should be long and soft.";
    } else if (config.vibe?.toLowerCase().includes("flash")) {
        materialLogic = "MATERIAL PHYSICS: High reflectivity on sequins/jewelry due to direct flash. High contrast shadows.";
    }

    const contentsParts = [
        { text: "You are a Senior Art Director for Fashion AI." },
        { text: "REFERENCE IMAGE (Person & Outfit):" },
        referenceImagePart,
        { text: `
        TASK: Regenerate this person in a specific environment and pose.
        
        INPUTS:
        - Target Pose: ${poseInstruction}
        - Target Vibe: ${vibeInstruction}
        
        CRITICAL INSTRUCTIONS:
        1. IDENTITY & OUTFIT: Preserve the face, hair, body type, and outfit details IDENTICAL to the Reference Image.
        2. PHYSICS & LIGHTING: Ensure the lighting of the environment interacts realistically with the fabric. ${materialLogic}
        3. POSE: ${config.pose ? "Change the pose as requested." : "Keep the pose natural and consistent with the new environment."}
        4. COMPOSITION: The subject must look anchored in the scene, not pasted.
        
        Return ONLY the image.
        ` }
    ];

    return generateWithFallback(
        { parts: contentsParts },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateLookVariation"
    );
};

// Legacy wrapper for compatibility if needed, though we update usage in App.tsx
export const generatePoseVariation = async (url: string, pose: string) => {
    return generateLookVariation(url, { pose });
};

export const createStylistChat = (): Chat => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });
    
    return ai.chats.create({
        model: 'gemini-3-pro-preview', // Chat uses Pro for reasoning capability
        config: {
            systemInstruction: "You are a friendly, knowledgeable, and encouraging fashion stylist assistant embedded in a Virtual Try-On app. Help users with style advice, outfit coordination, color theory, and fashion trends. Keep your responses concise, helpful, and conversational. Do not ask the user to upload photos to the chat, as you cannot see them directly, but you can guide them on how to use the app's try-on features.",
            thinkingConfig: { thinkingBudget: 2048 },
        }
    });
};

export const analyzeOutfitStyle = async (imageBase64: string): Promise<{ score: number; explanation: string }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });
    
    const imagePart = dataUrlToPart(imageBase64);
    const prompt = "Analyze the outfit worn by the person in this image. Rate the style on a scale of 1 to 10 based on color coordination, fit, and overall aesthetic. Provide a brief, helpful fashion stylist explanation (max 50 words).";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Flash is sufficient for text analysis
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    explanation: { type: Type.STRING }
                },
                required: ["score", "explanation"]
            }
        }
    });

    const cleanJson = response.text?.replace(/```json|```/g, '').trim();
    
    if (cleanJson) {
        try {
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse JSON style score", e);
        }
    }
    throw new Error("Failed to analyze style");
};
