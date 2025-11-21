/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Chat, Type } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for a high-end e-commerce website. The background must be a PURE WHITE background (RGB 255, 255, 255) to ensure a seamless look. The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic. Return ONLY the final image.";
    // FIX: Removed invalid `config` parameter. `responseModalities` is not a valid configuration for image generation models.
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    const prompt = `You are an expert virtual try-on AI. You will be given a 'model image' and a 'garment image'. Your task is to create a new photorealistic image where the person from the 'model image' is wearing the clothing from the 'garment image'.

**Crucial Rules:**
1.  **Complete Garment Replacement:** You MUST completely REMOVE and REPLACE the clothing item worn by the person in the 'model image' with the new garment. No part of the original clothing (e.g., collars, sleeves, patterns) should be visible in the final image.
2.  **Preserve the Model:** The person's face, hair, body shape, and pose from the 'model image' MUST remain unchanged.
3.  **Preserve the Background:** The background MUST remain PURE WHITE (RGB 255, 255, 255). Do not introduce any shadows or artifacts on the background.
4.  **Apply the Garment:** Realistically fit the new garment onto the person. It should adapt to their pose with natural folds, shadows on the body (but not the background), and lighting consistent with the original scene.
5.  **Output:** Return ONLY the final, edited image. Do not include any text.`;
    // FIX: Removed invalid `config` parameter. `responseModalities` is not a valid configuration for image generation models.
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The person and clothing must remain identical. The background must remain PURE WHITE (RGB 255, 255, 255). The new perspective should be: "${poseInstruction}". Return ONLY the final image.`;
    // FIX: Removed invalid `config` parameter. `responseModalities` is not a valid configuration for image generation models.
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
    });
    return handleApiResponse(response);
};

export const createStylistChat = (): Chat => {
    return ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
            systemInstruction: "You are a friendly, knowledgeable, and encouraging fashion stylist assistant embedded in a Virtual Try-On app. Help users with style advice, outfit coordination, color theory, and fashion trends. Keep your responses concise, helpful, and conversational. Do not ask the user to upload photos to the chat, as you cannot see them directly, but you can guide them on how to use the app's try-on features.",
        }
    });
};

export const analyzeOutfitStyle = async (imageBase64: string): Promise<{ score: number; explanation: string }> => {
    const imagePart = dataUrlToPart(imageBase64);
    const prompt = "Analyze the outfit worn by the person in this image. Rate the style on a scale of 1 to 10 based on color coordination, fit, and overall aesthetic. Provide a brief, helpful fashion stylist explanation (max 50 words).";

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

    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Failed to analyze style");
};