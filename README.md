# 🤖 AI Studio Replica

> A high-fidelity, agentic AI development environment built with React, Node.js, and the Gemini API.

![Banner](https://via.placeholder.com/1200x400/0b0f13/3b82f6?text=AI+Studio+Replica+Dashboard)

## 📖 Introduction

**AI Studio Replica** is a sophisticated clone of Google's AI Studio, designed to bridge the gap between simple chatbots and professional AI development environments. It features a dual-pane interface combining a multi-modal chat with a fully functional Project Workspace (IDE).

Unlike standard LLM wrappers, this project implements **Agentic Workflows**: it visualizes the AI's thought process, manages a virtual file system, and allows for non-linear history navigation via an execution graph.

## ✨ Key Features

### 1. 💬 Advanced Chat Interface
- **Multi-modal Input**: Drag & drop images, voice input (STT), and rich text.
- **Streaming Response**: Real-time typewriter effects with token usage stats.
- **Thinking Process**: Visualized `<think>` blocks for Gemini 2.0 Flash Thinking models.
- **Branching History**: Edit previous messages to create new conversation branches without losing history.

### 2. 💻 Integrated Project Workspace (IDE)
- **Virtual File System**: The AI can create, edit, and delete files in a virtual browser-based file system.
- **Dual View**: Switch between **Code Editor** (Monaco-like with PrismJS) and **Live Preview**.
- **Sandboxed Preview**: Renders HTML/CSS/JS artifacts instantly using Blob URL rewriting and virtual bundling.

### 3. 🕸️ Agent Flow Visualization (Graph)
- **Execution Graph**: Visualizes the conversation as a DAG (Directed Acyclic Graph).
- **Time Travel**: Click any node in the graph to inspect the state at that moment and **Restore** the context (files + chat) to that exact point.
- **Traceability**: See exactly which tool outputs or file changes resulted from which prompt.

### 4. 📝 AI Document Editor
- **"Medium-style" Editing**: A clean, focused writing environment.
- **Magic Toolbar**: Highlight any text to trigger AI actions: *Fix Grammar*, *Optimize*, *Expand*, or *Shorten*.
- **Backend Integration**: Powered by the backend proxy for secure model access.

### 5. ⚙️ Robust Backend & Architecture
- **Node.js Express Server**: Handles secure API proxying and sets COOP/COEP headers required for advanced browser features (WebContainers).
- **Ollama Support**: Drop-in support for local models like DeepSeek R1 via Ollama.

## 📸 Screenshots

| **Dashboard & Chat** | **Project Workspace (IDE)** |
|:---:|:---:|
| ![Chat Interface](https://via.placeholder.com/600x400/13161c/e0e0e0?text=Dark+Mode+Chat+Interface) | ![IDE Workspace](https://via.placeholder.com/600x400/1e1e1e/3b82f6?text=Split+Pane+Code+Editor) |
| *Streamlined chat with rich markdown support* | *Live preview of generated HTML/JS apps* |

| **Agent Graph Visualization** | **AI Document Writer** |
|:---:|:---:|
| ![Graph View](https://via.placeholder.com/600x400/0b0f13/a855f7?text=Node+Graph+Visualization) | ![Doc Editor](https://via.placeholder.com/600x400/13161c/22c55e?text=Floating+AI+Toolbar) |
| *Visual history and state restoration* | *Context-aware text optimization* |

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Language**: TypeScript
- **Runtime**: Node.js (Express)
- **AI Models**: 
  - Google GenAI SDK (`gemini-2.5-flash`, `gemini-3-pro`)
  - Local LLMs via Ollama
- **Core Libraries**: `prismjs` (Syntax Highlighting), `jszip` (Export), `@google/genai`

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- A Google Gemini API Key (or Ollama for local models)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-studio-replica.git
   cd ai-studio-replica
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_google_api_key_here
   ```

### Running the App

This project uses a custom Node.js server to serve the React app and handle API proxying.

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open in Browser**
   Navigate to `http://localhost:3000`.

## 📦 Project Structure

```
├── components/
│   ├── ChatInterface.tsx    # Main chat logic
│   ├── CodeEditor.tsx       # Syntax highlighted editor
│   ├── DocumentEditor.tsx   # AI writing tool
│   ├── FileExplorer.tsx     # Sidebar file tree
│   ├── FlowCanvas.tsx       # SVG-based graph viz
│   ├── NodeDetails.tsx      # Inspector panel
│   ├── PreviewPane.tsx      # Virtual bundler & iframe
│   └── SettingsPanel.tsx    # Model config
├── services/
│   └── geminiService.ts     # Unified AI service (Google + Ollama)
├── App.tsx                  # Main layout & State machine
├── server.js                # Express backend
└── constants.ts             # Config & Mock Data
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the MIT License.
