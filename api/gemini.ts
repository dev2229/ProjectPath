import { GoogleGenAI } from "@google/genai";

/**
 * Serverless function for Vercel to handle Gemini API requests securely.
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
    
    // Determine model based on task if needed, default to gemini-3-flash-preview
    const model = config?.model || 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: config?.responseMimeType || "application/json",
        responseSchema: config?.responseSchema,
        temperature: config?.temperature || 1,
      },
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(error.status || 500).json({ 
      message: error.message || 'An error occurred during AI generation' 
    });
  }
}