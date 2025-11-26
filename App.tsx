import React, { useState, useEffect, useRef } from 'react';
import { 
  FileData, ChatMessage, Settings, CanvasNode, CanvasEdge,
  DEFAULT_SYSTEM_INSTRUCTION 
} from './types';
import { INITIAL_FILES, GEMINI_MODELS } from './constants';
import { streamResponse } from './services/geminiService';

// Components
import ChatInterface from './components/ChatInterface';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import FlowCanvas from './components/FlowCanvas';
import SettingsPanel from './components/SettingsPanel';
import NodeDetails from './components/NodeDetails';

import { 
  Settings as SettingsIcon, Play, 
  MessageSquare, Plus, 
  Code2, Eye, GitGraph, Box, Download, Trash2
} from 'lucide-react';
import JSZip from 'jszip';

// Right Panel Modes
type RightPanelMode = 'WORKSPACE' | 'GRAPH';

const App: React.FC = () => {
  // --- STATE ---
  const [files, setFiles] = useState<FileData[]>(INITIAL_FILES);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>('readme.md');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<Settings>({
    model: GEMINI_MODELS[0].value,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    enableSearch: false,
  });
  
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('WORKSPACE');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
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
    if (savedFiles) setFiles(JSON.parse(savedFiles));
    if (savedMsgs) setMessages(JSON.parse(savedMsgs));
  }, []);

  // Persist state
  useEffect(() => {
    localStorage.setItem('ai-studio-files', JSON.stringify(files));
    localStorage.setItem('ai-studio-messages', JSON.stringify(messages));
  }, [files, messages]);

  // --- LOGIC ---

  const handleSendMessage = async (text: string, images: string[]) => {
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      images,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    // --- CANVAS LAYOUT LOGIC ---
    // Simple vertical stacking with horizontal branching for Model vs User
    // Find the lowest Y currently
    const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) : 0;
    const startY = nodes.length > 0 ? maxY + 150 : 50;

    // Add User Node
    const userNode: CanvasNode = {
       id: `msg-${userMsgId}`,
       type: 'user',
       x: 50, // User on left
       y: startY,
       data: { label: 'User Input', details: text }
    };
    
    // Create Placeholder Model Node immediately
    const aiMsgId = (Date.now() + 1).toString();
    const modelNode: CanvasNode = {
        id: `msg-${aiMsgId}`,
        type: 'model',
        x: 300, // Model in middle
        y: startY, 
        data: { label: 'Model Response', details: 'Thinking...' }
    };

    setNodes(prev => [...prev, userNode, modelNode]);
    setEdges(prev => [...prev, {
        id: `e-${userMsgId}-${aiMsgId}`,
        source: userNode.id,
        target: modelNode.id
    }]);

    // Initial placeholder message for streaming
    const aiMsgPlaceholder: ChatMessage = {
        id: aiMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
        thinkingTime: 0
    };
    setMessages(prev => [...prev, aiMsgPlaceholder]);

    try {
      const startTime = Date.now();
      
      const historyForApi = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }] 
      }));

      const stream = streamResponse(
        text,
        images,
        files,
        settings,
        historyForApi
      );

      let fullText = "";
      let groundingMetadata: any[] = [];

      for await (const chunk of stream) {
          const chunkText = chunk.text || "";
          fullText += chunkText;
          
          // Accumulate grounding metadata if available
          const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            chunks.forEach((c: any) => {
                if (c.web?.uri) {
                    groundingMetadata.push({ url: c.web.uri, title: c.web.title || c.web.uri });
                }
            });
          }

          // Update Message UI
          setMessages(prev => prev.map(msg => 
             msg.id === aiMsgId 
               ? { ...msg, text: fullText, groundingMetadata: groundingMetadata.length ? groundingMetadata : undefined } 
               : msg
          ));

          // Update Canvas Node UI
          setNodes(prev => prev.map(n => 
             n.id === modelNode.id
               ? { ...n, data: { ...n.data, details: fullText } }
               : n
          ));
      }

      const endTime = Date.now();
      
      // Final update with thinking time
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, thinkingTime: endTime - startTime } : msg
      ));

      // --- POST PROCESSING (Files & Tools) ---
      
      // 1. Tool Nodes (Search)
      if (groundingMetadata.length > 0) {
          const toolNode: CanvasNode = {
              id: `tool-${aiMsgId}`,
              type: 'tool',
              x: 300,
              y: startY + 120, 
              data: { label: 'Google Search', details: JSON.stringify(groundingMetadata)}
          };
          setNodes(prev => [...prev, toolNode]);
          setEdges(prev => [...prev, { id: `e-${aiMsgId}-tool`, source: modelNode.id, target: toolNode.id }]);
      }

      // 2. File Parsing & Nodes
      // Improved regex to handle attributes loosely
      const fileRegex = /<file\s+path=["']([^"']+)["'][^>]*>([\s\S]*?)<\/file>/gi;
      let match;
      let fileOffset = 0;
      const fileUpdates: FileData[] = [];
      // Clone current files
      const currentFilesMap = new Map(files.map(f => [f.path, f]));

      while ((match = fileRegex.exec(fullText)) !== null) {
          const path = match[1];
          const content = match[2].trim();
          const language = path.split('.').pop() || 'text';
          
          fileUpdates.push({path, content, language});
          currentFilesMap.set(path, {path, content, language});

          const fileNode: CanvasNode = {
            id: `file-${aiMsgId}-${fileOffset}`,
            type: 'file',
            x: 550, // Files on right
            y: startY + (fileOffset * 100),
            data: { label: path, details: content }
          };
          setNodes(prev => [...prev, fileNode]);
          setEdges(prev => [...prev, {
              id: `e-${aiMsgId}-file-${fileOffset}`,
              source: modelNode.id,
              target: fileNode.id
          }]);
          fileOffset++;
      }

      if (fileUpdates.length > 0) {
          setFiles(Array.from(currentFilesMap.values()));
          // Automatically switch to the first modified file
          setSelectedFilePath(fileUpdates[0].path);
      }

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: "Error generating response. Please check your network or API Key.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFile = (newContent: string) => {
    if (!selectedFilePath) return;
    setFiles(prev => prev.map(f => f.path === selectedFilePath ? { ...f, content: newContent } : f));
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

  const selectedFileContent = files.find(f => f.path === selectedFilePath);

  return (
    <div className="flex h-screen w-screen bg-[#0b0f13] text-[#e0e0e0] overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR: Library & Navigation */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-[#1e1e1e] bg-[#0b0f13]">
        <div className="h-14 flex items-center px-4 gap-2">
           <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md"></div>
           <span className="font-semibold text-lg tracking-tight text-white">AI Studio</span>
        </div>

        <div className="px-4 py-2">
          <button className="w-full flex items-center justify-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-blue-400 py-2.5 rounded-full border border-[#333] transition-colors text-sm font-medium">
            <Plus size={16} /> Create new
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2">
          <div className="text-xs font-semibold text-gray-500 px-4 mb-2 tracking-wider">MY LIBRARY</div>
          <div className="space-y-1">
             {[
               { title: 'Creative Writing Assistant', time: 'Today' },
               { title: 'Python Code Generator', time: 'Yesterday' },
               { title: 'Data Analysis Helper', time: '3 days ago' },
             ].map((item, i) => (
               <div key={i} className="px-4 py-2 hover:bg-[#1e1e1e] rounded-lg cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={14} className="text-gray-500 group-hover:text-gray-300" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-gray-300 group-hover:text-white truncate">{item.title}</span>
                      <span className="text-[10px] text-gray-600">{item.time}</span>
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
      <div className="flex-1 flex flex-col min-w-[400px] border-r border-[#1e1e1e] bg-[#13161c] relative">
        {/* Header */}
        <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-6 bg-[#13161c]">
           <span className="text-sm font-medium text-gray-300">Untitled prompt</span>
           
           <div className="flex items-center gap-4">
              {/* Top View Toggle */}
              <div className="flex bg-[#1e1e1e] p-0.5 rounded-lg border border-[#333]">
                 <button 
                   onClick={() => setRightPanelMode('WORKSPACE')}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${rightPanelMode === 'WORKSPACE' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    <Box size={14} /> Project
                 </button>
                 <button 
                   onClick={() => setRightPanelMode('GRAPH')}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${rightPanelMode === 'GRAPH' ? 'bg-[#2a2d35] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    <GitGraph size={14} /> Graph
                 </button>
              </div>

              <div className="h-6 w-px bg-[#333]"></div>

              <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-white transition-colors">
                 <SettingsIcon size={18} />
              </button>

              <button className="flex items-center gap-2 bg-[#2a2d35] hover:bg-[#374151] text-blue-400 px-4 py-1.5 rounded-full text-xs font-medium transition-colors border border-[#333]">
                 <Play size={14} fill="currentColor" /> Run
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
           <ChatInterface 
             messages={messages} 
             isLoading={isLoading} 
             onSendMessage={handleSendMessage} 
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

      {/* 3. RIGHT PANEL: Project Workspace / Graph */}
      {rightPanelMode === 'GRAPH' ? (
        <div className="w-[45%] bg-[#0b0f13] flex flex-col relative overflow-hidden">
           <div className="h-14 border-b border-[#1e1e1e] flex items-center px-4 bg-[#0b0f13]">
              <span className="font-semibold text-sm">Agent Execution Graph</span>
           </div>
           <div className="flex-1 relative">
             <FlowCanvas 
                nodes={nodes} 
                edges={edges} 
                onNodeClick={(node) => setSelectedNode(node)} 
             />
             
             {/* Node Details Overlay */}
             {selectedNode && (
                <NodeDetails 
                   node={selectedNode} 
                   onClose={() => setSelectedNode(null)} 
                />
             )}
           </div>
        </div>
      ) : (
        <div className="w-[45%] flex flex-col bg-[#0b0f13]">
          {/* Workspace Header */}
          <div className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-4 bg-[#0b0f13]">
            <div className="flex items-center gap-2">
               <span className="font-semibold text-sm text-gray-200">Project Workspace</span>
               <span className="bg-[#1e1e1e] text-gray-500 px-2 py-0.5 rounded text-[10px] border border-[#333]">+ {files.length} files</span>
            </div>
            <div className="flex gap-2">
                <button onClick={handleDownload} className="p-1.5 hover:bg-[#1e1e1e] rounded text-gray-400 hover:text-white" title="Download ZIP"><Download size={14} /></button>
                <button onClick={() => setFiles(INITIAL_FILES)} className="p-1.5 hover:bg-[#1e1e1e] rounded text-gray-400 hover:text-white" title="Reset"><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Split Pane: Explorer & Editor */}
          <div className="flex flex-1 overflow-hidden">
             
             {/* Pane 1: File Explorer */}
             <div className="w-56 border-r border-[#1e1e1e] flex flex-col">
                <FileExplorer 
                  files={files} 
                  selectedFile={selectedFilePath} 
                  onSelectFile={setSelectedFilePath} 
                />
             </div>

             {/* Pane 2: Editor / Preview */}
             <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
                {/* File Tab & Toggles */}
                {selectedFilePath ? (
                  <>
                    <div className="h-10 bg-[#0b0f13] border-b border-[#1e1e1e] flex items-center justify-between pr-2">
                       {/* Active Tab */}
                       <div className="flex">
                          <div className="px-4 py-2.5 bg-[#1e1e1e] border-r border-[#1e1e1e] text-xs text-blue-400 border-t-2 border-t-blue-500 flex items-center gap-2">
                             {selectedFilePath}
                          </div>
                       </div>
                       
                       {/* Code/Preview Toggle */}
                       <div className="flex bg-[#1e1e1e] p-0.5 rounded border border-[#333] scale-90 origin-right">
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
                            code={selectedFileContent?.content || ''} 
                            language={selectedFileContent?.language || 'text'} 
                            onChange={handleUpdateFile} 
                          />
                       ) : (
                          <>
                            <div className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-300 flex items-center px-4 text-xs text-gray-500">
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
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                    Select a file to view
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;