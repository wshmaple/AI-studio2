import { GoogleGenAI } from "@google/genai";
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

export const streamResponse = async function* (
  prompt: string,
  images: string[],
  files: FileData[],
  settings: Settings,
  history: { role: string; parts: { text: string }[] }[]
) {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct model name.
  let modelName = settings.model;
  // Handle alias mapping if strictly needed, though mapped in constants usually
  if (modelName === 'gemini-2.5-flash-thinking') {
    modelName = 'gemini-2.5-flash'; 
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

  try {
    const responseStream = await ai.models.generateContentStream({
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

    for await (const chunk of responseStream) {
      yield chunk;
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};