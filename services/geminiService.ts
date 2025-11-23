
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Chat, Type } from "@google/genai";
import { WardrobeItem } from "../types";

// Models Configuration
const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash-image';

// --- Types ---

export interface UserIdentityAnalysis {
    subject_identity: {
        gender: string;
        age_approx: number;
        ethnicity_descriptor: string;
        body_type: string;
    };
    facial_physics: {
        skin_texture: string;
        skin_tone_hex_approx: string;
        undertone: string;
        hair_details: string;
    };
    lighting_reference: {
        direction: string;
        shadow_hardness: string;
    };
    generation_prompt_fragment: string;
}

// --- Helper Functions ---

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
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            
            // Clear canvas to ensure transparency is preserved
            ctx.clearRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    // Use PNG to preserve transparency, crucial for "cut out" clothes
                    resolve(new File([blob], "optimized_image.png", { type: "image/png" }));
                } else {
                    reject(new Error("Image resizing failed"));
                }
            }, "image/png"); 
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
const generateWithFallback = async (
    contents: any, 
    config: any, 
    logContext: string
): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found. Please connect your Google account.");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        console.log(`[Gemini Service] ${logContext} - Attempting with ${PRIMARY_MODEL}...`);
        
        const response = await Promise.race([
            ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents,
                config
            }),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Primary model timeout")), 60000)
            )
        ]);

        console.log(`[Gemini Service] ${logContext} - Success with ${PRIMARY_MODEL}`);
        return handleApiResponse(response as GenerateContentResponse);

    } catch (error: any) {
        console.warn(`[Gemini Service] ${logContext} - Primary model failed: ${error.message}. Switching to fallback ${FALLBACK_MODEL}.`);
        
        try {
            const fallbackResponse = await Promise.race([
                ai.models.generateContent({
                    model: FALLBACK_MODEL,
                    contents,
                    config
                }),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error("Fallback model timeout")), 30000)
                )
            ]);
            
            console.log(`[Gemini Service] ${logContext} - Success with ${FALLBACK_MODEL}`);
            return handleApiResponse(fallbackResponse as GenerateContentResponse);

        } catch (fallbackError: any) {
            console.warn(`[Gemini Service] ${logContext} - Standard fallback failed: ${fallbackError.message}. Retrying with SAFE CONFIG.`);
            
            try {
                const safeResponse = await ai.models.generateContent({
                    model: FALLBACK_MODEL,
                    contents,
                    config: {} 
                });
                
                console.log(`[Gemini Service] ${logContext} - Success with Safe Fallback`);
                return handleApiResponse(safeResponse);
            } catch (finalError: any) {
                console.error(`[Gemini Service] ${logContext} - All attempts failed. Final error: ${finalError.message}`);
                throw finalError;
            }
        }
    }
};

// --- Analysis Services ---

// 1. User Identity Analysis (The "Deep Scan")
export const analyzeUserIdentity = async (file: File): Promise<UserIdentityAnalysis> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await fileToPart(file);

    const prompt = `
    Act as a High-End CGI Technical Director and Portrait Photographer.
    Analyze this user's selfie to output a "Dense Physical Descriptor".

    CRITICAL INSTRUCTION:
    - Ignore "beauty filters". Focus on REALISM.
    - Describe the "Imperfections" (pores, texture, asymmetry) to avoid the fake AI look.
    - Analyze exact Skin Undertone.

    OUTPUT FORMAT (Strict JSON):
    {
      "subject_identity": {
        "gender": "string",
        "age_approx": "integer",
        "ethnicity_descriptor": "string (e.g., 'South Asian with North Indian features')",
        "body_type": "string"
      },
      "facial_physics": {
        "skin_texture": "string (Describe pores, moles, freckles, uneven pigmentation. e.g., 'Visible skin porosity, slight stubble')",
        "skin_tone_hex_approx": "string",
        "undertone": "string",
        "hair_details": "string"
      },
      "lighting_reference": {
        "direction": "string",
        "shadow_hardness": "string"
      },
      "generation_prompt_fragment": "string (A 2-sentence prompt segment enforcing realism. e.g., 'Raw portrait photography, 85mm lens. High-frequency texture details, visible pores, no airbrushing.')" 
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Vision model
            contents: { parts: [imagePart, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        const text = response.text?.trim() || "{}";
        return JSON.parse(text) as UserIdentityAnalysis;
    } catch (e) {
        console.error("Failed to analyze user identity", e);
        // Return specific fallback structure
        throw new Error("Could not analyze face. Please try a clearer photo.");
    }
};

// 2. Garment Analysis (Kept intact)
export const generateItemDescription = async (file: File): Promise<{ category: 'Major' | 'Minor', description: string, file: File }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });
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
            model: 'gemini-2.5-flash', 
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

// 3. Wardrobe Item Analysis (Kept intact)
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
        return { name: file.name };
    }
};

// --- Generation Functions ---

export const generateModelImage = async (userImage: File, analysis: UserIdentityAnalysis): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    
    // Enhanced prompt for hyper-realism using the analysis data
    const prompt = `
    Generate a HYPER-PHOTOREALISTIC full-body fashion portrait of this person.

    SUBJECT IDENTITY:
    - Ethnicity/Features: ${analysis.subject_identity.ethnicity_descriptor}
    - Age: ${analysis.subject_identity.age_approx}
    - Body Type: ${analysis.subject_identity.body_type}
    
    PHYSICAL DETAILS (CRITICAL FOR REALISM):
    - Skin Texture: ${analysis.facial_physics.skin_texture}.
    - Hair: ${analysis.facial_physics.hair_details}.
    - Skin Tone: ${analysis.facial_physics.undertone} (Approx Hex: ${analysis.facial_physics.skin_tone_hex_approx}).
    
    PHOTOGRAPHY STYLE:
    ${analysis.generation_prompt_fragment}
    Shot on 35mm film, ISO 200. Natural skin texture, subsurface scattering (SSS), slight film grain, chromatic aberration, hyper-realistic, depth of field.
    
    MANDATORY RULES:
    1. EXACT IDENTITY: The face must match the reference photo exactly.
    2. NO AI SMOOTHING: Render visible pores and imperfections. Avoid the 'plastic' or 'airbrushed' look.
    3. LIGHTING: Professional studio softbox lighting. Neutral color temperature.
    4. POSE: Standing full-body, neutral confident pose, arms relaxed at sides.
    5. BACKGROUND: SOLID PURE WHITE (#FFFFFF).
    
    Output: A raw-style photograph.
    `;
    
    return generateWithFallback(
        { parts: [userImagePart, { text: prompt }] },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateModelImage"
    );
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    // 1. Analyze the garment (Double-Lock Strategy)
    let garmentDescription = "a fashion item";
    try {
        const analysis = await generateItemDescription(garmentImage);
        garmentDescription = analysis.description;
    } catch (e) {
        console.warn("Could not generate text description for garment, proceeding with image only.");
    }

    const contentsParts = [
        { text: "INPUT 1: The Person (The Target Body)." },
        modelImagePart,
        { text: "INPUT 2: The Clothing (The Source Garment)." },
        garmentImagePart,
        { text: `
        TASK: REPLACE the outfit of the person in INPUT 1 with the clothing from INPUT 2.
        
        INPUT 2 DESCRIPTION: ${garmentDescription}

        STRICT RULES:
        1. CLOTHING REPLACEMENT: IGNORE the original clothes in INPUT 1. Render the item from INPUT 2 with pixel-perfect texture fidelity.
        2. PHOTOREALISM: The final image must look like a RAW photograph. Skin must have texture (pores, wrinkles) and subsurface scattering. NO PLASTIC TEXTURES.
        3. PRESERVE IDENTITY: The person's face, hair, and skin tone must remain identical to INPUT 1.
        4. PHYSICS: The new clothing must drape naturally on the body.
        5. BACKGROUND: Pure White (#FFFFFF).
        
        Output: A single photorealistic image.
        ` }
    ];
    
    return generateWithFallback(
        { parts: contentsParts },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateVirtualTryOnImage"
    );
};

export const generateCompleteLook = async (modelImageUrl: string, garmentImages: File[]): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    
    const analyzedItems = await Promise.all(garmentImages.map(generateItemDescription));
    
    const majorItems = analyzedItems.filter(i => i.category === 'Major');
    const minorItems = analyzedItems.filter(i => i.category === 'Minor');
    
    const majorItemParts = await Promise.all(majorItems.map(item => fileToPart(item.file)));
    const minorItemDescriptions = minorItems.map(item => item.description).join(". Also wearing ");
    
    const contentsParts: any[] = [
        { text: "INPUT 1: The Reference Model." },
        modelImagePart
    ];

    if (majorItemParts.length > 0) {
        contentsParts.push({ text: "INPUT 2: The Clothing Stack." });
        contentsParts.push(...majorItemParts);
    }

    contentsParts.push({ text: `
        TASK: COMPOSITE the Clothing from INPUT 2 onto the Model in INPUT 1.
        
        EXECUTION:
        1. IDENTITY: The Model's identity and body shape must remain 100% IDENTICAL.
        2. PHOTOREALISM: Render as a RAW photograph. Ensure skin has realistic texture and subsurface scattering.
        3. TEXTURE TRANSFER: Transfer specific textures/prints of the source clothing.
        4. ${minorItemDescriptions ? `ACCESSORIES: Incorporate these additional items: ${minorItemDescriptions}.` : ''}
        5. BACKGROUND: Pure White (#FFFFFF).
        
        Output: A single high-fashion photorealistic image.
    `});
    
    return generateWithFallback(
        { parts: contentsParts },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateCompleteLook"
    );
};

export const generateLookVariation = async (
    referenceImageUrl: string, 
    config: { pose?: string, vibe?: string }
): Promise<string> => {
    const referenceImagePart = dataUrlToPart(referenceImageUrl);
    
    const poseInstruction = config.pose || "Maintain the current pose exactly.";
    const vibeInstruction = config.vibe || "isolated on a pure white background, soft even studio lighting.";

    let materialLogic = "";
    if (config.vibe?.toLowerCase().includes("tokyo")) {
        materialLogic = "MATERIAL PHYSICS: If the outfit contains Leather, Plastic, or Satin, render distinct neon reflections (pink/blue). If Cotton or Wool, simulate soft ambient light absorption. Wet ground reflections.";
    } else if (config.vibe?.toLowerCase().includes("golden")) {
        materialLogic = "MATERIAL PHYSICS: Add strong warm backlighting (rim light). Translucent fabrics should glow slightly. Shadows should be long and soft.";
    } else if (config.vibe?.toLowerCase().includes("flash")) {
        materialLogic = "MATERIAL PHYSICS: High reflectivity on sequins/jewelry due to direct flash. High contrast hard shadows.";
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
        1. IDENTITY & REALISM: Preserve the face, hair, and skin tone IDENTICAL to the Reference Image. Render with PHOTOREALISTIC skin texture (pores, imperfections). No 'AI plastic' skin.
        2. PHYSICS & LIGHTING: Ensure the lighting of the environment interacts realistically with the fabric. ${materialLogic}
        3. POSE: ${config.pose ? "Change the pose as requested." : "Keep the pose natural."}
        4. COMPOSITION: The subject must look anchored in the scene.
        
        Return ONLY the photorealistic image.
        ` }
    ];

    return generateWithFallback(
        { parts: contentsParts },
        { imageConfig: { aspectRatio: '3:4' } },
        "generateLookVariation"
    );
};

// Legacy wrapper
export const generatePoseVariation = async (url: string, pose: string) => {
    return generateLookVariation(url, { pose });
};

export const createStylistChat = (): Chat => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });
    
    return ai.chats.create({
        model: 'gemini-3-pro-preview', 
        config: {
            systemInstruction: "You are a friendly, knowledgeable fashion stylist. Help users with style advice. Keep responses concise.",
            thinkingConfig: { thinkingBudget: 2048 },
        }
    });
};

export const analyzeOutfitStyle = async (imageBase64: string): Promise<{ score: number; explanation: string }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("No API Key");
    const ai = new GoogleGenAI({ apiKey });
    
    const imagePart = dataUrlToPart(imageBase64);
    const prompt = "Analyze the outfit. Rate style 1-10. Provide a brief stylist explanation (max 50 words).";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
