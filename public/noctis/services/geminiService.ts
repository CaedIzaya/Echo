import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateReflection = async (userNote: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user has written a log for their day: "${userNote}". 
      
      Task: Generate a very short, calm, and poetic reflection or title for this day.
      Tone: Contemplative, non-judgmental, safe, quiet. Like a whisper in the night sky.
      Length: Maximum 10 words. 
      Format: Plain text only.`,
    });

    return response.text?.trim() || "A quiet moment recorded.";
  } catch (error) {
    console.error("Gemini reflection failed:", error);
    return "A moment in time.";
  }
};
