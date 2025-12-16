import { GoogleGenAI, Type } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateQuestions = async (topic: string, count: number = 5): Promise<string[]> => {
  try {
    const ai = getGeminiClient();
    const prompt = `Generate ${count} distinct, engaging trivia or math questions about "${topic}". 
    If it is a math problem, wrap mathematical formulas in single dollar signs like $x^2$. 
    Return ONLY a JSON array of strings, where each string is a question.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const questions: string[] = JSON.parse(text);
    return questions;

  } catch (error) {
    console.error("Failed to generate questions:", error);
    throw error;
  }
};