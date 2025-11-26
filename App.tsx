import React, { useState, useEffect, useRef } from 'react';
import { 
  FileData, ChatMessage, Settings, CanvasNode, CanvasEdge,
  DEFAULT_SYSTEM_INSTRUCTION, LibraryItem, RightPanelMode
} from './types';
import { INITIAL_FILES, AVAILABLE_MODELS, SAMPLE_LIBRARY_ITEMS } from './constants';
import { streamResponse } from './services/geminiService';

// Components
import ChatInterface from './components/ChatInterface';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import FlowCanvas from './components/FlowCanvas';
import SettingsPanel from './components/SettingsPanel';
import NodeDetails from './components/NodeDetails';
import DocumentEditor from './components/DocumentEditor';

import { 
  Settings as SettingsIcon, Play, 
  MessageSquare, Plus, 
  Code2, Eye, GitGraph, Box, Download, Trash2, X as CloseIcon,
  PanelLeft, FileText
} from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  // --- STATE ---
  const [files, setFiles] = useState<FileData[]>(INITIAL_FILES);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<Settings>({
    model: AVAILABLE_MODELS[0].value,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    enableSearch: false,
    ollamaUrl: 'http://localhost:11434',
  });
  
  // Default is hidden (null)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Workspace Tab State (Code vs Preview)
  const [workspaceView, setWorkspaceView] = useState<'code' | 'preview'>('preview');

  // Canvas State
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);

  // Load state from local storage on mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('ai-studio-files');
    const savedMsgs = localStorage.getItem('ai-studio-messages');
    if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        setFiles(parsedFiles);
        if (parsedFiles.length > 0) {
            setSelectedFilePath(parsedFiles[0].path);
        }
    }
    if (savedMsgs) setMessages(JSON.parse(savedMsgs));
  }, []);

  // Persist state
  useEffect(() => {
    localStorage.setItem('ai-studio-files', JSON.stringify(files));
    localStorage.setItem('ai-studio-messages', JSON.stringify(messages));
  }, [files, messages]);

  // --- CORE GENERATION LOGIC ---

  const generateAIResponse = async (
    currentMessages: ChatMessage[], 
    userText: string, 
    userImages: string[],
    existingFiles: FileData[]
  ) => {
    setIsLoading(true);

    const aiMsgId = (Date.now() + 1).toString();
    const userMsgId = currentMessages[currentMessages.length - 1]?.id || 'unknown';

    // --- CANVAS LAYOUT PREP ---
    const NODE_SPACING_Y = 180;
    const COLUMN_MODEL = 350;
    const COLUMN_ARTIFACTS = 650;

    let startY = 50;
    // Find the Y position of the user node we just added/are responding to
    const existingUserNode = nodes.find(n => n.id === `msg-${userMsgId}`);
    if (existingUserNode) {
        startY = existingUserNode.y;
    } else if (nodes.length > 0) {
        const maxY = Math.max(...nodes.map(n => n.y));
        startY = maxY + NODE_SPACING_Y;
    }
    
    const modelNode: CanvasNode = {
        id: `msg-${aiMsgId}`,
        type: 'model',
        x: COLUMN_MODEL,
        y: startY, 
        data: { label: 'Model Response', details: 'Thinking...' }
    };

    setNodes(prev => [...prev, modelNode]);
    
    // Connect to User Node
    const userNodeId = `msg-${userMsgId}`;
    setEdges(prev => [...prev, {
        id: `e-${userMsgId}-${aiMsgId}`,
        source: userNodeId,
        target: modelNode.id
    }]);

    const aiMsgPlaceholder: ChatMessage = {
        id: aiMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
        thinkingTime: 0
    };
    
    // Add placeholder to UI
    setMessages(prev => [...prev, aiMsgPlaceholder]);

    try {
      const startTime = Date.now();
      // Filter out empty placeholder we just added for the API history
      const historyForApi = currentMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }] 
      }));

      const stream = streamResponse(
        userText,
        userImages,
        existingFiles,
        settings,
        historyForApi
      );

      let fullText = "";
      let groundingMetadata: any[] = [];

      for await (const chunk of stream) {
          const chunkText = chunk.text || "";
          fullText += chunkText;
          
          const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            chunks.forEach((c: any) => {
                if (c.web?.uri) {
                    groundingMetadata.push({ url: c.web.uri, title: c.web.title || c.web.uri });
                }
            });
          }

          setMessages(prev => prev.map(msg => 
             msg.id === aiMsgId 
               ? { ...msg, text: fullText, groundingMetadata: groundingMetadata.length ? groundingMetadata : undefined } 
               : msg
          ));

          setNodes(prev => prev.map(n => 
             n.id === modelNode.id
               ? { ...n, data: { ...n.data, details: fullText } }
               : n
          ));
      }

      const endTime = Date.now();
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, thinkingTime: endTime - startTime } : msg
      ));

      // --- POST PROCESSING (TOOLS, FILES) ---
      let artifactOffsetY = 0;
      
      if (groundingMetadata.length > 0) {
          const toolNode: CanvasNode = {
              id: `tool-${aiMsgId}`,
              type: 'tool',
              x: COLUMN_ARTIFACTS,
              y: startY + (artifactOffsetY * 100), 
              data: { label: 'Google Search', details: JSON.stringify(groundingMetadata)}
          };
          setNodes(prev => [...prev, toolNode]);
          setEdges(prev => [...prev, { id: `e-${aiMsgId}-tool`, source: modelNode.id, target: toolNode.id }]);
          artifactOffsetY++;
      }

      const fileRegex = /<file\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/file>/gi;
      let match;
      const fileUpdates: FileData[] = [];
      const currentFilesMap = new Map(existingFiles.map(f => [f.path, f]));

      while ((match = fileRegex.exec(fullText)) !== null) {
          const path = match[1];
          const content = match[2].trim();
          const language = path.split('.').pop() || 'text';
          
          fileUpdates.push({path, content, language});
          currentFilesMap.set(path, {path, content, language});

          const fileNode: CanvasNode = {
            id: `file-${aiMsgId}-${artifactOffsetY}`,
            type: 'file',
            x: COLUMN_ARTIFACTS,
            y: startY + (artifactOffsetY * 120),
            data: { label: path, details: content }
          };
          setNodes(prev => [...prev, fileNode]);
          setEdges(prev => [...prev, {
              id: `e-${aiMsgId}-file-${artifactOffsetY}`,
              source: modelNode.id,
              target: fileNode.id
          }]);
          artifactOffsetY++;
      }

      if (fileUpdates.length > 0) {
          const newFiles = Array.from(currentFilesMap.values());
          setFiles(newFiles);
          setSelectedFilePath(fileUpdates[0].path);
          // Auto open workspace if files are generated
          if (rightPanelMode !== 'GRAPH') {
            setRightPanelMode('WORKSPACE');
          }
      }

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: `Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, images: string[]) => {
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      images,
      timestamp: Date.now()
    };

    // Graph node for User
    // Position it below the LAST VISIBLE message in the active chain
    const NODE_SPACING_Y = 180;
    const COLUMN_USER = 50;
    
    // Find the node corresponding to the last message currently in view
    const lastMsgId = messages.length > 0 ? messages[messages.length - 1].id : null;
    const lastNode = lastMsgId ? nodes.find(n => n.id === `msg-${lastMsgId}`) : null;
    
    let startY = 50;
    if (lastNode) {
        startY = lastNode.y + NODE_SPACING_Y;
    } else if (nodes.length > 0) {
        // Fallback if we can't find link (e.g. fresh start)
        const maxY = Math.max(...nodes.map(n => n.y));
        startY = maxY + NODE_SPACING_Y;
    }

    const userNode: CanvasNode = {
       id: `msg-${userMsgId}`,
       type: 'user',
       x: COLUMN_USER,
       y: startY,
       data: { label: 'User Prompt', details: text }
    };
    
    // Connect to previous model node if exists in the ACTIVE chain
    if (lastNode) {
        setEdges(prev => [...prev, {
            id: `e-flow-${lastNode.id}-${userNode.id}`,
            source: lastNode.id,
            target: userNode.id
        }]);
    }

    setNodes(prev => [...prev, userNode]);
    
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    // Trigger AI
    await generateAIResponse(updatedMessages, text, images, files);
  };

  const handleRetry = (modelMsgId: string) => {
    // 1. Find the message index
    const index = messages.findIndex(m => m.id === modelMsgId);
    if (index === -1) return;

    // 2. We do NOT delete the node. We effectively "Branch" history.
    // The previous user message is at index - 1.
    const userMsg = messages[index - 1];
    if (!userMsg || userMsg.role !== 'user') return;

    // 3. Reset the UI messages state to exclude the model response we are retrying.
    // However, the Graph still retains the "abandoned" node.
    const newMessages = messages.slice(0, index);
    setMessages(newMessages);

    // 4. Re-generate. This will create a NEW model node in generateAIResponse.
    // It will connect to the EXISTING user node (since we didn't remove it).
    // But wait, generateAIResponse creates a NEW edge.
    // We need to ensure logic allows multiple edges from one user node.
    generateAIResponse(newMessages, userMsg.text, userMsg.images || [], files);
  };

  const handleEdit = (modelMsgId: string) => {
    const index = messages.findIndex(m => m.id === modelMsgId);
    if (index === -1) return null;

    const userMsg = messages[index - 1];
    if (!userMsg || userMsg.role !== 'user') return null;

    // Return text to editor
    const textToEdit = userMsg.text;
    const imagesToEdit = userMsg.images || [];

    // "rewind" history before the user message
    const newMessages = messages.slice(0, index - 1);
    setMessages(newMessages);

    // We do NOT remove nodes. The user will effectively create a new branch 
    // starting from the node BEFORE the user message.
    return { text: textToEdit, images: imagesToEdit };
  };

  // --- NAVIGATION (Time Travel) ---
  const handleRestoreFromNode = (nodeId: string) => {
     // This function reconstructs the message history AND file state leading up to a specific node.
     
     if (!nodeId.startsWith('msg-')) return; // Only restore to chat messages
     
     // 1. Trace back parents to root to build the "Timeline"
     const path: string[] = [nodeId];
     let currentId = nodeId;
     
     // Safety counter
     let steps = 0;
     while (steps < 200) {
        const edge = edges.find(e => e.target === currentId);
        if (!edge) break; // Root reached
        path.unshift(edge.source);
        currentId = edge.source;
        steps++;
     }

     // 2. Reconstruct Messages from Path
     const restoredMessages: ChatMessage[] = [];
     
     // 3. Reconstruct File State
     // We start from INITIAL_FILES and apply changes found in Model nodes along the path
     const reconstructedFilesMap = new Map(INITIAL_FILES.map(f => [f.path, f]));

     path.forEach(nid => {
        const n = nodes.find(node => node.id === nid);
        if (n && (n.type === 'user' || n.type === 'model')) {
             // Rebuild Message
             const role = n.type === 'user' ? 'user' : 'model';
             const text = n.data.details;
             
             restoredMessages.push({
                 id: n.id.replace('msg-', ''),
                 role: role as 'user' | 'model',
                 text: text,
                 timestamp: Date.now() // Approximate
             });

             // If it's a model message, re-apply any file changes contained in it
             if (role === 'model') {
                 const fileRegex = /<file\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/file>/gi;
                 let match;
                 while ((match = fileRegex.exec(text)) !== null) {
                     const path = match[1];
                     const content = match[2].trim();
                     const language = path.split('.').pop() || 'text';
                     reconstructedFilesMap.set(path, { path, content, language });
                 }
             }
        }
     });

     setMessages(restoredMessages);
     setFiles(Array.from(reconstructedFilesMap.values()));
     
     // If files exist, select the first one, otherwise null
     if (reconstructedFilesMap.size > 0) {
         // Try to keep selection if possible, else select first
         if (!selectedFilePath || !reconstructedFilesMap.has(selectedFilePath)) {
             setSelectedFilePath(Array.from(reconstructedFilesMap.keys())[0]);
         }
     } else {
         setSelectedFilePath(null);
     }

     setSelectedNode(null);
  };

  const handleUpdateFile = (newContent: string) => {
    if (!selectedFilePath) return;
    setFiles(prev => prev.map(f => f.path === selectedFilePath ? { ...f, content: newContent } : f));
  };

  // Improved selection handler to auto-switch to code view
  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
    setWorkspaceView('code'); // Switch to code view to ensure the user sees the file
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    files.forEach(f => {
      zip.file(f.path, f.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadLibraryItem = (item: LibraryItem) => {
    setMessages(item.messages);
    setFiles(item.files);
    setNodes([]); // Clear graph for new session as we don't persist graph in library sample
    setEdges([]);
    if (item.files.length > 0) {
       setSelectedFilePath(item.files[0].path);
       setRightPanelMode('WORKSPACE');
    } else {
       setSelectedFilePath(null);
       setRightPanelMode(null);
    }
  };

  const handleCreateNew = () => {
     setMessages([]);
     setFiles([]);
     setSelectedFilePath(null);
     setNodes([]);
     setEdges([]);
     setRightPanelMode(null);
  };

  // --- AI DOC ACTIONS ---
  const handleAiDocAction = async (text: string, operation: 'optimize' | 'fix' | 'expand' | 'shorten') => {
      const prompts = {
          optimize: "Rewrite the following text to be more professional, concise, and clear:",
          fix: "Fix grammar and spelling errors in the following text, keeping the tone unchanged:",
          expand: "Expand upon the following text with more detail and depth:",
          shorten: "Summarize the following text concisely:"
      };

      const prompt = `${prompts[operation]}\n\n"${text}"\n\nReturn ONLY the modified text, without quotes or preamble.`;
      
      let result = "";
      try {
          const stream = streamResponse(prompt, [], [], settings, []);
          for await (const chunk of stream) {
              if (chunk.text) result += chunk.text;
          }
      } catch (e) {
          console.error("Doc transform error", e);
          result = text; // Fallback
      }
      return result.trim();
  };

  const selectedFileContent = files.find(f => f.path === selectedFilePath);

  return (
    <div className="flex h-screen w-screen bg-[#0b0f13] text-[#e0e0e0] overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR: Library & Navigation */}
      <div className={`${isSidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 flex-shrink-0 flex flex-col border-r border-[#1e1e1e] bg-[#0b0f13] md:flex`}>
        <div className="h-14 flex items-center px-4 gap-2">
           <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md"></div>
           <span className="font-semibold text-lg tracking-tight text-white">AI Studio</span>
        </div>

        <div className="px-4 py-2">
          <button 
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-blue-400 py-2.5 rounded-full border border-[#333] transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Create new
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2">
          <div className="text-xs font-semibold text-gray-500 px-4 mb-2 tracking-wider">MY LIBRARY</div>
          <div className="space-y-1">
             {SAMPLE_LIBRARY_ITEMS.map((item) => (
               <div 
                 key={item.id} 
                 onClick={() => handleLoadLibraryItem(item)}
                 className="px-4 py-2 hover:bg-[#1e1e1e] rounded-lg cursor-pointer group"
               >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={14} className="text-gray-500 group-hover:text-gray-300" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-gray-300 group-hover:text-white truncate">{item.title}</span>
                      <span className="text-[10px] text-gray-600">{item.date}</span>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="p-4 text-xs text-gray-600 border-t border-[#1e1e1e]">
          Google AI Studio Replica
        </div>
      </div>

      {/* 2. MIDDLE PANEL: Chat / Prompt Interface */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#1e1e1e] bg-[#13161c] relative transition-all duration-300">
        {/* Header */}
        <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-4 bg-[#13161c]">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="text-gray-500 hover:text-white transition-colors"
                title="Toggle Sidebar"
              >
                 <PanelLeft size={20} />
              </button>
              <span className="text-sm font-medium text-gray-300 truncate mr-4">Untitled prompt</span>
           </div>
           
           <div className="flex items-center gap-4 flex-shrink-0">
              {/* Top View Toggle */}
              <div className="flex bg-[#1e1e1e] p-0.5 rounded-lg border border-[#333]">
                 <button 
                   onClick={() => setRightPanelMode(rightPanelMode === 'WORKSPACE' ? null : 'WORKSPACE')}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${rightPanelMode === 'WORKSPACE' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    <Box size={14} /> Project
                 </button>
                 <button 
                   onClick={() => setRightPanelMode(rightPanelMode === 'GRAPH' ? null : 'GRAPH')}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${rightPanelMode === 'GRAPH' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    <GitGraph size={14} /> Graph
                 </button>
                 <button 
                   onClick={() => setRightPanelMode(rightPanelMode === 'DOCS' ? null : 'DOCS')}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${rightPanelMode === 'DOCS' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    <FileText size={14} /> Docs
                 </button>
              </div>

              <div className="h-6 w-px bg-[#333]"></div>

              <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-colors">
                 <SettingsIcon size={18} />
              </button>

              <button 
                 onClick={() => handleSendMessage(messages[messages.length-1]?.text || "Run", [])}
                 className="flex items-center gap-2 bg-[#2a2d35] hover:bg-[#374151] text-blue-400 px-4 py-1.5 rounded-full text-xs font-medium transition-colors border border-[#333]"
              >
                 <Play size={14} fill="currentColor" /> Run
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative min-h-0">
           <ChatInterface 
             messages={messages} 
             isLoading={isLoading} 
             onSendMessage={handleSendMessage} 
             onRetry={handleRetry}
             onEdit={handleEdit}
           />
           
           {/* Settings Drawer */}
           <SettingsPanel 
              settings={settings} 
              onUpdate={setSettings} 
              isOpen={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)} 
            />
        </div>
      </div>

      {/* 3. RIGHT PANEL: Project Workspace / Graph / Docs */}
      {rightPanelMode && (
        <div className="w-[40%] 2xl:w-[45%] flex-shrink-0 bg-[#0b0f13] flex flex-col relative overflow-hidden border-l border-[#1e1e1e]">
           
           {/* Header for Close */}
           <div className="absolute top-0 right-0 z-20 p-2">
             <button 
                onClick={() => setRightPanelMode(null)}
                className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-gray-500 hover:text-white transition-colors"
             >
                <CloseIcon size={16} />
             </button>
           </div>

           {rightPanelMode === 'GRAPH' && (
            <div className="h-full flex flex-col">
              <div className="h-14 border-b border-[#1e1e1e] flex items-center px-4 bg-[#0b0f13]">
                  <span className="font-semibold text-sm">Agent Execution Graph</span>
              </div>
              <div className="flex-1 relative">
                <FlowCanvas 
                    nodes={nodes} 
                    edges={edges} 
                    onNodeClick={(node) => setSelectedNode(node)} 
                />
                
                {selectedNode && (
                    <NodeDetails 
                      node={selectedNode} 
                      onClose={() => setSelectedNode(null)}
                      onRestore={() => handleRestoreFromNode(selectedNode.id)}
                    />
                )}
              </div>
            </div>
          )}

          {rightPanelMode === 'DOCS' && (
             <div className="h-full flex flex-col bg-[#13161c]">
                 <DocumentEditor onAiTransform={handleAiDocAction} />
             </div>
          )}

          {rightPanelMode === 'WORKSPACE' && (
            <div className="h-full flex flex-col">
              {/* Workspace Header */}
              <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-4 bg-[#0b0f13] pr-12">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-200">Project Workspace</span>
                  <span className="bg-[#1e1e1e] text-gray-500 px-2 py-0.5 rounded text-[10px] border border-[#333]">{files.length} files</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownload} className="p-1.5 hover:bg-[#1e1e1e] rounded text-gray-400 hover:text-white" title="Download ZIP"><Download size={14} /></button>
                    <button 
                      onClick={() => {
                          setFiles(INITIAL_FILES);
                          setSelectedFilePath(null);
                      }} 
                      className="p-1.5 hover:bg-[#1e1e1e] rounded text-gray-400 hover:text-white" 
                      title="Reset"
                    >
                      <Trash2 size={14} />
                    </button>
                </div>
              </div>

              {/* Split Pane: Explorer & Editor */}
              <div className="flex flex-1 overflow-hidden">
                
                {/* Pane 1: File Explorer */}
                <div className="w-56 border-r border-[#1e1e1e] flex flex-col flex-shrink-0">
                    <FileExplorer 
                      files={files} 
                      selectedFile={selectedFilePath} 
                      onSelectFile={handleFileSelect} 
                    />
                </div>

                {/* Pane 2: Editor / Preview */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
                    {/* File Tab & Toggles */}
                    {selectedFilePath ? (
                      <>
                        <div className="h-10 bg-[#0b0f13] border-b border-[#1e1e1e] flex items-center justify-between pr-2">
                          {/* Active Tab */}
                          <div className="flex overflow-hidden">
                              <div className="px-4 py-2.5 bg-[#1e1e1e] border-r border-[#1e1e1e] text-xs text-blue-400 border-t-2 border-t-blue-500 flex items-center gap-2 truncate">
                                {selectedFilePath}
                              </div>
                          </div>
                          
                          {/* Code/Preview Toggle */}
                          <div className="flex bg-[#1e1e1e] p-0.5 rounded border border-[#333] scale-90 origin-right flex-shrink-0">
                              <button 
                                onClick={() => setWorkspaceView('code')}
                                className={`px-3 py-1 rounded text-[10px] font-medium flex items-center gap-1.5 transition-all ${workspaceView === 'code' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                              >
                                  <Code2 size={12} /> Code
                              </button>
                              <button 
                                onClick={() => setWorkspaceView('preview')}
                                className={`px-3 py-1 rounded text-[10px] font-medium flex items-center gap-1.5 transition-all ${workspaceView === 'preview' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                              >
                                  <Eye size={12} /> Preview
                              </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative">
                          {workspaceView === 'code' ? (
                              <CodeEditor 
                                key={selectedFilePath}
                                code={selectedFileContent?.content || ''} 
                                language={selectedFileContent?.language || 'text'} 
                                onChange={handleUpdateFile} 
                              />
                          ) : (
                              <>
                                <div className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-300 flex items-center px-4 text-xs text-gray-500 z-10">
                                  Preview Mode
                                  <span className="ml-auto opacity-50">{selectedFilePath}</span>
                                </div>
                                <div className="pt-8 h-full">
                                  <PreviewPane files={files} />
                                </div>
                              </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm p-4 text-center">
                        <p>No file selected</p>
                        <p className="text-xs text-gray-600 mt-2">Generate code in the chat to see files here</p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default App;