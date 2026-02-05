import { GoogleGenAI } from "@google/genai";

/**
 * Serverless function to handle Gemini API requests securely.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { prompt, config } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Default to flash for summaries, pro for deep dives
    const modelName = config?.model || 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: config?.responseMimeType || "application/json",
        responseSchema: config?.responseSchema,
        temperature: config?.temperature ?? 0.7,
      },
    });

    if (!response || !response.text) {
      throw new Error("Empty response from AI model");
    }

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(error.status || 500).json({ 
      message: error.message || 'An error occurred during AI generation' 
    });
  }
}