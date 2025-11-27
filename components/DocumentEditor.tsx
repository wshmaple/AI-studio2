import React, { useRef, useState, useEffect } from 'react';
import { 
  Wand2, AlignLeft, Check, Maximize2, Minimize2, 
  Bold, Italic, Underline, Heading1, Heading2, List, Quote, 
  Download, Type, Terminal, Send, Briefcase, Coffee, Smile
} from 'lucide-react';

interface DocumentEditorProps {
  initialContent?: string;
  onAiTransform: (text: string, operation: string, customPrompt?: string) => Promise<string>;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  initialContent = "<h1>Project Solution Draft</h1><p>Select text here to see AI magic options...</p>", 
  onAiTransform 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  // Update stats on content change
  const updateStats = () => {
      if (contentRef.current) {
          const text = contentRef.current.innerText || "";
          setStats({
              words: text.trim().split(/\s+/).filter(w => w.length > 0).length,
              chars: text.length
          });
      }
  };

  useEffect(() => {
      updateStats();
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setToolbarPosition(null);
        setSelectedText('');
        return;
      }

      const text = selection.toString();
      if (!text.trim()) {
         setToolbarPosition(null);
         return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = contentRef.current?.getBoundingClientRect();
      
      if (editorRect) {
          // Calculate position ensuring it doesn't go off screen
          let top = rect.top - 60;
          let left = rect.left + (rect.width / 2) - 150; // Center visually

          // Boundary checks
          if (left < 10) left = 10;
          if (top < 10) top = rect.bottom + 10; // Flip to bottom if too close to top

          setToolbarPosition({ top, left });
          setSelectedText(text);
      }
    };

    const el = contentRef.current;
    if (el) {
        el.addEventListener('mouseup', handleSelection);
        el.addEventListener('keyup', handleSelection);
        el.addEventListener('input', updateStats);
    }

    return () => {
      if (el) {
          el.removeEventListener('mouseup', handleSelection);
          el.removeEventListener('keyup', handleSelection);
          el.removeEventListener('input', updateStats);
      }
    };
  }, []);

  const handleAction = async (operation: string, custom?: string) => {
    if (!selectedText || isProcessing) return;
    
    setIsProcessing(true);
    try {
        const newText = await onAiTransform(selectedText, operation, custom);
        
        // Simple text replacement using execCommand to preserve undo stack if possible
        // Note: execCommand is deprecated but widely supported for simple contentEditable
        document.execCommand('insertText', false, newText);
        
        setToolbarPosition(null);
        setCustomPrompt('');
        window.getSelection()?.removeAllRanges();
        updateStats();
    } catch (e) {
        console.error("AI Transform failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const execFormat = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      contentRef.current?.focus();
  };

  const handleExportMarkdown = () => {
      if (!contentRef.current) return;
      let html = contentRef.current.innerHTML;
      
      // Very basic HTML to Markdown converter
      let md = html
          .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
          .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
          .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
          .replace(/<b>(.*?)<\/b>/g, '**$1**')
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<i>(.*?)<\/i>/g, '*$1*')
          .replace(/<em>(.*?)<\/em>/g, '*$1*')
          .replace(/<u>(.*?)<\/u>/g, '__$1__')
          .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
          .replace(/<ul>(.*?)<\/ul>/g, '$1\n')
          .replace(/<li>(.*?)<\/li>/g, '- $1\n')
          .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n\n')
          .replace(/<br>/g, '\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/<[^>]*>/g, ''); // Strip remaining tags

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.md';
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#13161c] relative">
       {/* 1. Formatting Toolbar (Fixed Top) */}
       <div className="h-12 border-b border-[#1e1e1e] bg-[#0b0f13] flex items-center px-4 justify-between flex-shrink-0">
           <div className="flex items-center gap-1">
              <button onClick={() => execFormat('bold')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="Bold"><Bold size={16} /></button>
              <button onClick={() => execFormat('italic')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="Italic"><Italic size={16} /></button>
              <button onClick={() => execFormat('underline')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="Underline"><Underline size={16} /></button>
              <div className="w-px h-4 bg-[#333] mx-1"></div>
              <button onClick={() => execFormat('formatBlock', 'H1')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="Heading 1"><Heading1 size={16} /></button>
              <button onClick={() => execFormat('formatBlock', 'H2')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="Heading 2"><Heading2 size={16} /></button>
              <div className="w-px h-4 bg-[#333] mx-1"></div>
              <button onClick={() => execFormat('insertUnorderedList')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="List"><List size={16} /></button>
              <button onClick={() => execFormat('formatBlock', 'blockquote')} className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-400 hover:text-white" title="Quote"><Quote size={16} /></button>
           </div>
           
           <div className="flex items-center gap-4">
               <div className="text-[10px] text-gray-600 flex gap-2">
                   <span>{stats.words} words</span>
                   <span>{stats.chars} chars</span>
               </div>
               <button 
                onClick={handleExportMarkdown}
                className="flex items-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] text-xs px-3 py-1.5 rounded border border-[#333] text-gray-300 transition-colors"
               >
                   <Download size={14} /> Export MD
               </button>
           </div>
       </div>

       {/* 2. Editor Area */}
       <div className="flex-1 overflow-y-auto p-8 bg-[#13161c]">
          <div 
             ref={contentRef}
             contentEditable
             spellCheck={false}
             className="prose prose-invert max-w-3xl mx-auto focus:outline-none min-h-[500px] text-gray-200 leading-relaxed"
             dangerouslySetInnerHTML={{ __html: initialContent }}
             onKeyDown={(e) => {
                 // Basic tab support
                 if (e.key === 'Tab') {
                     e.preventDefault();
                     document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                 }
             }}
          />
       </div>

       {/* 3. Floating AI Toolbar */}
       {toolbarPosition && (
          <div 
            className="fixed z-50 flex flex-col bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 w-[320px]"
            style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
          >
             {/* AI Header */}
             <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252525] rounded-t-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                    <Wand2 size={12} /> AI Assistant
                </div>
                {isProcessing && <span className="text-[10px] text-gray-400 animate-pulse">Processing...</span>}
             </div>

             {/* Presets */}
             <div className="p-1 grid grid-cols-4 gap-1">
                 <button onClick={() => handleAction('fix')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Fix Grammar">
                     <Check size={14} className="text-green-400 group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] text-gray-400">Fix</span>
                 </button>
                 <button onClick={() => handleAction('optimize')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Optimize Wording">
                     <Type size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] text-gray-400">Polish</span>
                 </button>
                 <button onClick={() => handleAction('expand')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Expand Text">
                     <Maximize2 size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] text-gray-400">Expand</span>
                 </button>
                 <button onClick={() => handleAction('shorten')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Shorten Text">
                     <Minimize2 size={14} className="text-orange-400 group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] text-gray-400">Shorten</span>
                 </button>
             </div>

             <div className="border-t border-[#333] my-1"></div>
             
             {/* Tone Section */}
             <div className="px-2 py-0.5 mb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
               Tone
             </div>
             <div className="px-1 grid grid-cols-3 gap-1 mb-2">
                 <button onClick={() => handleAction('tone_professional')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Professional">
                     <Briefcase size={14} className="text-gray-300 group-hover:text-blue-300 transition-colors" />
                     <span className="text-[10px] text-gray-400">Pro</span>
                 </button>
                 <button onClick={() => handleAction('tone_casual')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Casual">
                     <Coffee size={14} className="text-gray-300 group-hover:text-orange-300 transition-colors" />
                     <span className="text-[10px] text-gray-400">Casual</span>
                 </button>
                 <button onClick={() => handleAction('tone_friendly')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Friendly">
                     <Smile size={14} className="text-gray-300 group-hover:text-yellow-300 transition-colors" />
                     <span className="text-[10px] text-gray-400">Friendly</span>
                 </button>
             </div>

             {/* Custom Input */}
             <div className="p-2 border-t border-[#333] flex gap-2">
                 <div className="relative flex-1">
                     <Terminal size={12} className="absolute left-2 top-2.5 text-gray-500" />
                     <input 
                        type="text" 
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAction('custom', customPrompt)}
                        placeholder="Ask AI to..."
                        className="w-full bg-[#13161c] border border-[#333] rounded pl-7 pr-2 py-1.5 text-xs text-gray-200 focus:border-purple-500 outline-none"
                     />
                 </div>
                 <button 
                    disabled={!customPrompt.trim()}
                    onClick={() => handleAction('custom', customPrompt)}
                    className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                 >
                     <Send size={12} />
                 </button>
             </div>
          </div>
       )}
    </div>
  );
};

export default DocumentEditor;