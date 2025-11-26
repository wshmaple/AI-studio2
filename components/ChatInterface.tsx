import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, GroundingMetadata } from '../types';
import { Send, Image as ImageIcon, Mic, RefreshCw, Pencil, BrainCircuit, Plus, X as XIcon } from 'lucide-react';

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

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  // Voice Input (Web Speech API)
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    
    // Check compatibility
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

  const renderContent = (text: string) => {
    // Basic formatting for the chat
    // If thinking model, check for <think> tags
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    let mainContent = text;
    let thinkingContent = null;

    if (thinkMatch) {
      thinkingContent = thinkMatch[1];
      mainContent = text.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    }

    // Strip <file> tags for cleaner chat view, as they appear in the file explorer
    const cleanContent = mainContent.replace(/<file\s+path="[^"]+">[\s\S]*?<\/file>/g, '[File generated, see Workspace]');

    return (
      <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-200">
        {thinkingContent && (
           <details className="mb-4 bg-[#1a1a1a] p-3 rounded border border-[#333] text-gray-400">
             <summary className="cursor-pointer font-mono text-xs flex items-center gap-2 hover:text-white">
               <BrainCircuit size={14} /> Chain of Thought
             </summary>
             <div className="mt-2 text-xs font-mono whitespace-pre-wrap pl-4 border-l-2 border-gray-600">
               {thinkingContent}
             </div>
           </details>
        )}
        <div className="whitespace-pre-wrap">{cleanContent}</div>
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
        
        {messages.map((msg) => (
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
                   {renderContent(msg.text)}
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
                {msg.role === 'model' && (
                  <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
                     {msg.thinkingTime && <span>{(msg.thinkingTime / 1000).toFixed(1)}s</span>}
                     <button className="hover:text-white flex items-center gap-1"><RefreshCw size={10}/> Retry</button>
                     <button className="hover:text-white flex items-center gap-1"><Pencil size={10}/> Edit</button>
                  </div>
                )}
             </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-[#333]">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
             <div className="flex items-center text-sm text-gray-500">Thinking...</div>
          </div>
        )}
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