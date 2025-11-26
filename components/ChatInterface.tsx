import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, GroundingMetadata } from '../types';
import { Send, Image as ImageIcon, Mic, RefreshCw, Pencil, BrainCircuit, Plus, X as XIcon, ChevronDown, ChevronRight } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, images: string[]) => void;
}

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
        parts.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    // If no match but text contains opening <think> (streaming case partial)
    if (parts.length === 0 && text.includes('<think>') && !text.includes('</think>')) {
       const [pre, think] = text.split('<think>');
       if (pre) parts.push({ type: 'text', content: pre });
       parts.push({ type: 'think', content: think, partial: true });
    } else if (parts.length === 0) {
       parts.push({ type: 'text', content: text });
    }

    return (
      <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-200">
        {parts.map((part, idx) => {
           if (part.type === 'think') {
              return (
                <details key={idx} open className="group mb-4">
                  <summary className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-300 list-none mb-1 select-none">
                     <div className="flex items-center gap-1 transition-transform group-open:rotate-90">
                        <ChevronRight size={12} />
                     </div>
                     <BrainCircuit size={14} className="text-purple-400" />
                     <span>Thought Process</span>
                     {part.partial && <span className="animate-pulse">...</span>}
                  </summary>
                  <div className="pl-4 border-l-2 border-[#333] text-gray-400 text-xs font-mono whitespace-pre-wrap py-2 bg-[#1a1a1a]/50 rounded-r">
                    {part.content}
                  </div>
                </details>
              );
           }
           // Cleanup file tags for chat view
           const cleanText = part.content.replace(/<file\s+path=["']([^"']+)["'][^>]*>[\s\S]*?<\/file>/gi, (match, path) => {
               return `\n[Generated file: ${path}]\n`;
           });
           
           return (
             <div key={idx} className="whitespace-pre-wrap">
               {cleanText}
               {isStreaming && idx === parts.length - 1 && (
                 <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-middle"></span>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
             <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl mb-4 animate-pulse"></div>
             <p className="text-sm font-medium">Start prompting</p>
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

                  <div className="text-sm">
                     {renderContent(msg.text, isModelStreaming)}
                  </div>
                  
                  {msg.groundingMetadata && msg.groundingMetadata.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                       {msg.groundingMetadata.map((g, idx) => (
                         <a key={idx} href={g.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 bg-[#1e1e1e] px-2 py-1 rounded-full text-blue-400 hover:text-blue-300 border border-[#333]">
                           <span className="truncate max-w-[150px]">{g.title}</span>
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
        
        <div className="bg-[#1e1e1e] rounded-xl border border-[#333] flex flex-col focus-within:border-gray-600 transition-colors shadow-lg">
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