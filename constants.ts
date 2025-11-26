export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-thinking', label: 'Gemini 2.5 Flash (Thinking)' }, // Simulated alias for prompt logic
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
];

export const INITIAL_FILES = [
  {
    path: 'readme.md',
    content: '# Welcome to AI Studio Replica\n\nStart chatting to generate code. Files will appear here.',
    language: 'markdown',
  }
];
