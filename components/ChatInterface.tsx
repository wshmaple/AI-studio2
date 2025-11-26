import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, GroundingMetadata } from '../types';
import { Send, Image as ImageIcon, Mic, RefreshCw, Pencil, BrainCircuit, Plus, X as XIcon, ChevronDown, ChevronRight, Sparkles, Terminal, Code, BookOpen } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, images: string[]) => void;
}

const QUICK_STARTS = [
  {
    icon: <Code size={24} className="text-blue-400" />,
    title: "Web Application",
    desc: "Create a modern To-Do list with HTML/CSS/JS",
    prompt: "Create a modern To-Do list app with HTML, CSS, and JS. It should look modern and have a dark mode."
  },
  {
    icon: <Terminal size={24} className="text-green-400" />,
    title: "Data Analysis",
    desc: "Python script to analyze CSV data",
    prompt: "Write a Python script using pandas to analyze a CSV file and visualize the results with matplotlib."
  },
  {
    icon: <BookOpen size={24} className="text-purple-400" />,
    title: "Creative Writing",
    desc: "Sci-fi story about a robot gardener",
    prompt: "Write a short sci-fi story about a robot who loves gardening."
  }
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading, onSendMessage }) => {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]); // Base64 strings
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll logic: only auto-scroll if user is near bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length-1]?.text]);

  const handleSend = () => {
    if (!input.trim() && images.length === 0) return;
    onSendMessage(input, images);
    setInput('');
    setImages([]);
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Voice Input
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support speech recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + " " + transcript);
    };
    recognition.start();
  };

  const renderContent = (text: string, isStreaming: boolean) => {
    // Regex for <think> tags
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = thinkRegex.exec(text)) !== null) {
        // Text before the think block
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }
        // The think block
        parts.push({ type: 'think', content: match[1] });
        lastIndex = thinkRegex.lastIndex;
    }
    // Remaining text
    if (lastIndex < text.length) {
        // Check for partial open tag if streaming
        const remaining = text.substring(lastIndex);
        if (remaining.includes('<think>') && !remaining.includes('</think>')) {
             const [pre, post] = remaining.split('<think>');
             if (pre) parts.push({ type: 'text', content: pre });
             parts.push({ type: 'think', content: post, partial: true });
        } else {
             parts.push({ type: 'text', content: remaining });
        }
    }
    
    return (
      <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-200">
        {parts.map((part, idx) => {
           if (part.type === 'think') {
              return (
                <div key={idx} className="mb-4">
                  <details open className="group bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
                    <summary className="flex items-center gap-2 cursor-pointer p-2 bg-[#252525] text-xs font-medium text-gray-400 hover:text-gray-200 select-none transition-colors">
                       <div className="flex items-center gap-1 transition-transform group-open:rotate-90">
                          <ChevronRight size={12} />
                       </div>
                       <BrainCircuit size={14} className="text-purple-400" />
                       <span>Thinking Process</span>
                       {part.partial && <span className="animate-pulse ml-2 text-purple-400/70">Generating thought...</span>}
                    </summary>
                    <div className="p-3 text-gray-400 text-xs font-mono whitespace-pre-wrap leading-relaxed border-t border-[#333]">
                      {part.content}
                    </div>
                  </details>
                </div>
              );
           }
           
           // Cleanup file tags for chat view
           const cleanText = part.content.replace(/<file\s+path=["']([^"']+)["'][^>]*>[\s\S]*?<\/file>/gi, (match, path) => {
               return `\n\n[Generated file: ${path}]\n\n`;
           });
           
           return (
             <div key={idx} className="whitespace-pre-wrap inline">
               {cleanText}
               {isStreaming && idx === parts.length - 1 && (
                 <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle rounded-sm shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
               )}
             </div>
           );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#13161c] relative">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center p-8">
             <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <Sparkles size={32} className="text-blue-400" />
             </div>
             <h2 className="text-2xl font-semibold text-white mb-2">Welcome to AI Studio</h2>
             <p className="text-gray-400 mb-10 max-w-md text-center">Start a new creative journey with high-fidelity multi-modal interactions.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
                {QUICK_STARTS.map((item, idx) => (
                   <button 
                     key={idx}
                     onClick={() => onSendMessage(item.prompt, [])}
                     className="flex flex-col items-start p-5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] hover:border-blue-500/50 rounded-xl transition-all group text-left"
                   >
                      <div className="mb-3 p-2 rounded-lg bg-[#2a2a2a] group-hover:bg-[#333] transition-colors">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-200 mb-1">{item.title}</span>
                      <span className="text-xs text-gray-500 leading-relaxed">{item.desc}</span>
                   </button>
                ))}
             </div>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          const isModelStreaming = msg.role === 'model' && isLastMessage && isLoading;

          return (
            <div key={msg.id} className="flex gap-4 group">
               {/* Avatar/Icon */}
               <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-gray-400 border border-[#333]">
                  {msg.role === 'user' ? 'U' : 'AI'}
               </div>

               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-semibold text-gray-400">{msg.role === 'user' ? 'You' : 'Gemini'}</span>
                     <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {msg.role === 'user' && msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {msg.images.map((img, i) => (
                        <img key={i} src={img} alt="upload" className="w-24 h-24 object-cover rounded-md border border-gray-700" />
                      ))}
                    </div>
                  )}

                  <div className="text-sm leading-relaxed">
                     {renderContent(msg.text, isModelStreaming)}
                  </div>
                  
                  {msg.groundingMetadata && msg.groundingMetadata.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                       {msg.groundingMetadata.map((g, idx) => (
                         <a key={idx} href={g.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1.5 bg-[#1e1e1e] px-2 py-1.5 rounded-md text-blue-400 hover:text-blue-300 hover:bg-[#252525] border border-[#333] transition-colors">
                           <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                           <span className="truncate max-w-[200px]">{g.title}</span>
                         </a>
                       ))}
                    </div>
                  )}
                  
                  {/* Actions (Hover) */}
                  {msg.role === 'model' && !isModelStreaming && (
                    <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
                       {msg.thinkingTime && <span>{(msg.thinkingTime / 1000).toFixed(1)}s</span>}
                       <button className="hover:text-white flex items-center gap-1"><RefreshCw size={10}/> Retry</button>
                       <button className="hover:text-white flex items-center gap-1"><Pencil size={10}/> Edit</button>
                    </div>
                  )}
               </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#13161c] via-[#13161c] to-transparent">
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1 px-1">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                 <img src={img} className="h-12 rounded-md border border-[#444]" alt="preview" />
                 <button 
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity border border-gray-600"
                 >
                   <XIcon size={10} /> 
                 </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="bg-[#1e1e1e] rounded-xl border border-[#333] flex flex-col focus-within:border-gray-600 transition-colors shadow-2xl">
           <textarea
             ref={inputRef}
             value={input}
             onChange={(e) => {
               setInput(e.target.value);
               e.target.style.height = 'auto';
               e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
             }}
             onKeyDown={handleKeyDown}
             placeholder="Type something..."
             className="w-full bg-transparent text-gray-200 p-3 pl-4 max-h-48 resize-none focus:outline-none text-sm placeholder-gray-600 font-sans"
             rows={1}
           />
           <div className="flex justify-between items-center p-2 pl-2 pr-2">
              <div className="flex gap-1">
                 <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-blue-400 transition-colors">
                    <Plus size={18} />
                 </button>
                 <label className="cursor-pointer p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors">
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                    <ImageIcon size={18} />
                 </label>
                 <button 
                   onClick={toggleListening}
                   className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'hover:bg-[#2a2a2a] text-gray-400 hover:text-white'}`}
                 >
                    <Mic size={18} />
                 </button>
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] text-gray-600 hidden sm:block">
                   Enter to run, Shift+Enter for new line
                 </span>
                 <span className="text-[10px] text-gray-600 w-12 text-right">
                   {input.length} chars
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;