
export interface FileData {
  path: string;
  content: string;
  language: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  images?: string[]; // base64 strings
  timestamp: number;
  thinkingTime?: number; // ms
  groundingMetadata?: GroundingMetadata[];
  isThinking?: boolean; // For UI state
  thinkingContent?: string; // Content inside <think> tags
}

export interface GroundingMetadata {
  url: string;
  title: string;
}

export interface Settings {
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  systemInstruction: string;
  enableSearch: boolean;
}

export interface CanvasNode {
  id: string;
  type: 'user' | 'model' | 'file' | 'tool';
  x: number;
  y: number;
  data: {
    label: string;
    details: string;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
  files: FileData[];
}

export enum ViewMode {
  CHAT = 'CHAT',
  CANVAS = 'CANVAS',
}

export const DEFAULT_SYSTEM_INSTRUCTION = `You are an expert AI software engineer and creative assistant.
When asked to write code, you MUST wrap file contents in a specific XML format:
<file path="path/to/filename.ext">
... code content ...
</file>

Always use this format for code generation. This allows the IDE to extract and run the code.
For HTML/CSS/JS projects, ensure you create an index.html.
`;
