/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const getApiKey = (): string => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key === 'PLACEHOLDER_API_KEY' || key === 'your_gemini_api_key_here') {
        throw new Error(
            'Gemini API key not configured. Add your key to .env.local:\n' +
            'VITE_GEMINI_API_KEY=your_actual_key_here\n\n' +
            'Get a free key at https://aistudio.google.com/apikey'
        );
    }
    return key;
};
// Helper function to convert a File or Base64 string to a Gemini API Part
const inputToPart = async (input: File | string): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    // Case 1: Input is already a Base64 Data URL string
    if (typeof input === 'string') {
        const arr = input.split(',');
        if (arr.length < 2) throw new Error("Invalid data URL format");
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
        
        return { 
            inlineData: { 
                mimeType: mimeMatch[1], 
                data: arr[1] 
            } 
        };
    }

    // Case 2: Input is a File object
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(input);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from file");
    
    return { 
        inlineData: { 
            mimeType: mimeMatch[1], 
            data: arr[1] 
        } 
    };
};

/**
 * Generates an image of an object using Imagen.
 * @param prompt A description of the object to generate.
 * @returns A promise that resolves to the base64 encoded image data.
 */
export const generateObjectImage = async (prompt: string): Promise<string> => {
    console.log(`Generating image with prompt: "${prompt}"`);
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const fullPrompt = `${prompt}, on a plain white background, studio quality, centered, isolated object.`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("Image generation failed, no images returned.");
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("The AI failed to generate an image. Please try again.");
    }
};

/**
 * Analyzes two images to determine if an object fits into a space.
 * @param objectInput The file or base64 string for the object.
 * @param spaceInput The file or base64 string for the space.
 * @returns A promise that resolves to an object with a verdict and explanation.
 */
export const analyzeFit = async (
    objectInput: File | string, 
    spaceInput: File | string,
): Promise<AnalysisResult> => {
  console.log('Starting spatial analysis...');
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  // Convert inputs to parts (handles both File objects and Base64 strings efficiently)
  const objectImagePart = await inputToPart(objectInput);
  const spaceImagePart = await inputToPart(spaceInput);

  const prompt = `You are an expert spatial reasoning assistant and a virtual mover. Your task is to analyze two images: the first is an 'object' and the second is a 'space' (like a doorway, hallway, or stairwell).

Your goal is to determine if the object can physically fit through the space. You must consider the object's dimensions (height, width, depth) and the space's dimensions.

Instructions:
1. Analyze the first image to estimate the dimensions of the object. Use common knowledge of object sizes for scale.
2. Analyze the second image to estimate the dimensions of the space. Use common reference points like light switches or door knobs for scale.
3. Compare the dimensions. Crucially, consider different orientations. A couch might not fit horizontally but might fit if tilted diagonally ('hooked') or stood on its end.
4. Based on your analysis, provide a clear verdict and a detailed explanation.

Output ONLY JSON.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        verdict: {
          type: Type.STRING,
          description: "A one-word verdict: 'Yes' if it fits easily, 'Tight' if it will be a very close fit or require maneuvering, or 'No' if it will not fit.",
          enum: ["Yes", "Tight", "No"],
        },
        explanation: {
          type: Type.STRING,
          description: "A detailed explanation for your verdict, written in a helpful and friendly tone. Explain the estimated dimensions and the reasoning.",
        },
      },
      required: ["verdict", "explanation"],
    };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, objectImagePart, spaceImagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });
    
    let jsonText = response.text.trim();
    
    // Clean up potential Markdown formatting often returned by LLMs even with JSON mode
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    console.log('Received AI response:', jsonText);
    const result = JSON.parse(jsonText);
    
    if (!result.verdict || !result.explanation) {
        throw new Error("Invalid JSON response from model.");
    }
    
    return result as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing fit:", error);
    throw new Error("The AI failed to analyze the images. Please try again with different images.");
  }
};