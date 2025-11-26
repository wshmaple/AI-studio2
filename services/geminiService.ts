
import { GoogleGenAI } from "@google/genai";
import { Settings, FileData } from "../types";
import { AVAILABLE_MODELS } from "../constants";

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

// Handle Ollama API Calls
const streamOllamaResponse = async function* (
  model: string,
  prompt: string,
  images: string[],
  settings: Settings,
  files: FileData[]
) {
  const OLLAMA_URL = settings.ollamaUrl || 'http://localhost:11434';
  
  // Build Messages
  const messages = [];

  // System Instruction
  if (settings.systemInstruction) {
      messages.push({ role: 'system', content: settings.systemInstruction });
  }

  // Construct context with files
  const fileContext = buildContextFromFiles(files);
  const fullContent = `${fileContext}\n${prompt}`;

  // User Message
  messages.push({
      role: 'user',
      content: fullContent,
      images: images.length > 0 ? images.map(i => i.split(',')[1]) : undefined
  });

  try {
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              model: model,
              messages: messages,
              stream: true,
              options: {
                  temperature: settings.temperature,
                  top_p: settings.topP,
                  top_k: settings.topK,
                  num_predict: settings.maxOutputTokens
              }
          })
      });

      if (!response.ok) {
          throw new Error(`Ollama Error: ${response.status} ${response.statusText}. Make sure Ollama is running at ${OLLAMA_URL} with CORS allowed.`);
      }
      
      if (!response.body) throw new Error('No response body from Ollama');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
              try {
                  const json = JSON.parse(line);
                  if (json.message?.content) {
                      yield {
                          text: json.message.content,
                          candidates: [{ groundingMetadata: null }]
                      };
                  }
                  if (json.done) return;
              } catch (e) {
                  console.warn("Failed to parse Ollama JSON chunk", e);
              }
          }
      }

  } catch (error) {
      console.error("Ollama Service Error:", error);
      throw error;
  }
};

export const streamResponse = async function* (
  prompt: string,
  images: string[],
  files: FileData[],
  settings: Settings,
  history: { role: string; parts: { text: string }[] }[]
) {
  
  // Check Provider
  const selectedModelDef = AVAILABLE_MODELS.find(m => m.value === settings.model);
  const isOllama = selectedModelDef?.provider === 'ollama';

  if (isOllama) {
      yield* streamOllamaResponse(settings.model, prompt, images, settings, files);
      return;
  }

  // --- Google GenAI Logic ---
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct model name.
  let modelName = settings.model;
  let thinkingConfig = undefined;

  // Handle alias mapping for Thinking model
  if (modelName === 'gemini-2.5-flash-thinking') {
    modelName = 'gemini-2.5-flash'; 
    // Enable thinking with a default budget if user selected the thinking variant
    thinkingConfig = { thinkingBudget: 8192 }; 
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
        tools: tools.length > 0 ? tools : undefined,
        thinkingConfig: thinkingConfig
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