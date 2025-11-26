import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Settings, FileData } from "../types";

// Helper to convert file data to context string
const buildContextFromFiles = (files: FileData[]): string => {
  if (files.length === 0) return "";
  let context = "\n\n--- CURRENT PROJECT CONTEXT ---\n";
  files.forEach(f => {
    context += `File: ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n\n`;
  });
  context += "--- END CONTEXT ---\n";
  return context;
};

export const generateResponse = async (
  prompt: string,
  images: string[],
  files: FileData[],
  settings: Settings,
  history: { role: string; parts: { text: string }[] }[]
): Promise<{ text: string; groundingMetadata: any[]; }> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct model name. Handle custom logic if needed for specific aliases
  let modelName = settings.model;
  if (modelName === 'gemini-2.5-flash-thinking') {
    modelName = 'gemini-2.5-flash'; // Use flash but we might interpret thinking differently in UI
  }

  // Build tools config
  const tools: any[] = [];
  if (settings.enableSearch) {
    tools.push({ googleSearch: {} });
  }

  const fileContext = buildContextFromFiles(files);
  const fullPrompt = `${fileContext}\n${prompt}`;

  // Build parts
  const parts: any[] = [];
  
  // Add images
  images.forEach(img => {
    // strip data:image/png;base64, prefix if present
    const base64Data = img.split(',')[1] || img;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg', // Assuming jpeg/png for simplicity
        data: base64Data
      }
    });
  });

  parts.push({ text: fullPrompt });

  // Map history to proper format
  // Note: For simplicity in this demo, we might just use generateContent with system instruction
  // For full chat history, we'd use ai.chats.create, but generateContent allows stateless flexibility here
  // with manual history injection if we wanted strict multi-turn.
  // We will simply simulate history by prepending for this "Replica" to keep state simple.

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: settings.systemInstruction,
        temperature: settings.temperature,
        topP: settings.topP,
        topK: settings.topK,
        maxOutputTokens: settings.maxOutputTokens,
        tools: tools.length > 0 ? tools : undefined
      }
    });

    // Extract text
    const text = response.text || "";
    
    // Extract grounding
    let groundingMetadata: any[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((c: any) => {
            if (c.web?.uri) {
                groundingMetadata.push({ url: c.web.uri, title: c.web.title || c.web.uri });
            }
        });
    }

    return { text, groundingMetadata };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
