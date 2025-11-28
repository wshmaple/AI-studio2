
import React, { useRef, useState, useEffect } from 'react';
import { 
  Wand2, Bold, Italic, Underline, Heading1, Heading2, List, Quote, 
  Download, Type, Terminal, Send, Briefcase, Coffee, Smile,
  Check, Maximize2, Minimize2, Sparkles, Languages, ChevronRight
} from 'lucide-react';

interface DocumentEditorProps {
  initialContent?: string;
  onAiTransform: (text: string, operation: string, customPrompt?: string) => Promise<string>;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  initialContent = "<h1>Project Solution Draft</h1><p>Select text here to see AI magic options, or type '/' for commands...</p>", 
  onAiTransform 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // AI Toolbar State
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeSubMenu, setActiveSubMenu] = useState<'main' | 'tone' | 'translate'>('main');

  // Stats
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  // Slash Command State
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Manually set innerHTML once on mount to prevent React from re-rendering the contentEditable 
    // div and destroying the selection when the toolbar state changes.
    if (contentRef.current) {
        contentRef.current.innerHTML = initialContent;
        updateStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // --- STATS & UTILS ---
  const updateStats = () => {
      if (contentRef.current) {
          const text = contentRef.current.innerText || "";
          setStats({
              words: text.trim().split(/\s+/).filter(w => w.length > 0).length,
              chars: text.length
          });
      }
  };

  // --- TEXT SELECTION HANDLER (AI TOOLBAR) ---
  useEffect(() => {
    const handleSelectionInteraction = (e: MouseEvent | KeyboardEvent) => {
      // 1. If we are clicking INSIDE the toolbar, do not close it.
      if ((e.target as HTMLElement).closest('.ai-toolbar')) return;
      
      // 2. Delay slightly to ensure selection API is updated
      setTimeout(() => {
          const selection = window.getSelection();
          
          // Basic validation
          if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setToolbarPosition(null);
            setSelectedText('');
            setActiveSubMenu('main');
            return;
          }

          // Ensure selection is inside the editor
          if (contentRef.current && !contentRef.current.contains(selection.anchorNode)) {
              setToolbarPosition(null);
              return;
          }

          const text = selection.toString();
          if (!text.trim()) {
             setToolbarPosition(null);
             return;
          }

          // 3. Calculate Geometry
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          const TOOLBAR_WIDTH = 320;
          const PADDING = 10;
          const OFFSET = 12;

          // Horizontal Center
          let left = rect.left + (rect.width / 2) - (TOOLBAR_WIDTH / 2);
          
          // Edge Detection (Horizontal)
          if (left < PADDING) left = PADDING;
          if (left + TOOLBAR_WIDTH > window.innerWidth - PADDING) {
              left = window.innerWidth - TOOLBAR_WIDTH - PADDING;
          }

          // Vertical Positioning (Smart Flip)
          // Default: Place ABOVE the selection
          let top = rect.top - OFFSET;
          let placement: 'top' | 'bottom' = 'top';

          // If not enough space on top (approx 200px needed for full expansion), flip to bottom
          if (rect.top < 220) {
              top = rect.bottom + OFFSET;
              placement = 'bottom';
          }

          setToolbarPosition({ top, left, placement });
          setSelectedText(text);
          setCustomPrompt(''); // Reset prompt on new selection
      }, 10);
    };

    document.addEventListener('mouseup', handleSelectionInteraction);
    document.addEventListener('keyup', handleSelectionInteraction); // For Shift+Arrow selection

    return () => {
        document.removeEventListener('mouseup', handleSelectionInteraction);
        document.removeEventListener('keyup', handleSelectionInteraction);
    };
  }, []);

  // --- SLASH COMMANDS HANDLER ---
  const SLASH_COMMANDS = [
      { id: 'continue', label: 'Continue writing', icon: <Sparkles size={14} className="text-purple-400"/>, desc: 'AI writes next paragraph' },
      { id: 'brainstorm', label: 'Brainstorm ideas', icon: <Wand2 size={14} className="text-blue-400"/>, desc: 'Generate list of ideas' },
      { id: 'h1', label: 'Heading 1', icon: <Heading1 size={14} />, desc: 'Big section header' },
      { id: 'h2', label: 'Heading 2', icon: <Heading2 size={14} />, desc: 'Medium section header' },
      { id: 'list', label: 'Bullet List', icon: <List size={14} />, desc: 'Create a list' },
  ];

  const filteredCommands = SLASH_COMMANDS.filter(c => 
     c.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
         // Slash Menu Navigation
         if (slashMenuPos) {
             if (e.key === 'ArrowDown') {
                 e.preventDefault();
                 setSlashSelectedIndex(prev => (prev + 1) % filteredCommands.length);
             } else if (e.key === 'ArrowUp') {
                 e.preventDefault();
                 setSlashSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
             } else if (e.key === 'Enter') {
                 e.preventDefault();
                 executeSlashCommand(filteredCommands[slashSelectedIndex]);
             } else if (e.key === 'Escape') {
                 setSlashMenuPos(null);
             }
             return;
         }

         // Trigger Slash Menu
         if (e.key === '/' && !e.shiftKey) {
             // We wait a tick to let the '/' be inserted, then we get position
             setTimeout(() => {
                 const selection = window.getSelection();
                 if (selection && selection.rangeCount > 0) {
                     const range = selection.getRangeAt(0);
                     const rect = range.getBoundingClientRect();
                     // Only trigger if inside editor
                     if (contentRef.current?.contains(selection.anchorNode)) {
                         setSlashMenuPos({ top: rect.bottom + 5, left: rect.left });
                         setSlashFilter('');
                         setSlashSelectedIndex(0);
                     }
                 }
             }, 0);
         }
     };

     const handleInput = () => {
         // If menu open, update filter based on text after '/'
         if (slashMenuPos) {
             const selection = window.getSelection();
             if (selection && selection.anchorNode) {
                 const text = selection.anchorNode.textContent || '';
                 // This is a naive check, assumes '/' is near end. 
                 // In production, you'd track the token start.
                 const parts = text.split('/');
                 const lastPart = parts[parts.length - 1];
                 setSlashFilter(lastPart);
             }
         }
     };

     document.addEventListener('keydown', handleKeyDown);
     document.addEventListener('input', handleInput);
     return () => {
         document.removeEventListener('keydown', handleKeyDown);
         document.removeEventListener('input', handleInput);
     };
  }, [slashMenuPos, filteredCommands, slashSelectedIndex]);

  const executeSlashCommand = async (cmd: typeof SLASH_COMMANDS[0]) => {
      setSlashMenuPos(null);
      // Remove the slash and filter text
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
          const range = selection.getRangeAt(0);
          // Select back to '/'
          // This logic is simplified for demo. It deletes current line content mostly.
          const node = selection.anchorNode;
          if (node.textContent) {
              const text = node.textContent;
              const slashIndex = text.lastIndexOf('/');
              range.setStart(node, slashIndex);
              range.setEnd(node, text.length);
              range.deleteContents();
          }
      }

      if (cmd.id === 'h1') execFormat('formatBlock', 'H1');
      else if (cmd.id === 'h2') execFormat('formatBlock', 'H2');
      else if (cmd.id === 'list') execFormat('insertUnorderedList');
      else if (cmd.id === 'continue' || cmd.id === 'brainstorm') {
          // AI Actions that use FULL context
          const fullText = contentRef.current?.innerText || "";
          setIsProcessing(true);
          try {
             // For slash commands, we insert at cursor
             const newText = await onAiTransform(fullText, cmd.id);
             document.execCommand('insertText', false, newText);
             updateStats();
          } catch(e) { console.error(e); }
          setIsProcessing(false);
      }
      contentRef.current?.focus();
  };

  // --- ACTIONS ---

  const handleAiAction = async (operation: string, custom?: string) => {
    if (!selectedText || isProcessing) return;
    
    setIsProcessing(true);
    try {
        // If tone or translate, we use selected text
        const newText = await onAiTransform(selectedText, operation, custom);
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
      updateStats();
  };

  const handleExportMarkdown = () => {
      if (!contentRef.current) return;
      let html = contentRef.current.innerHTML;
      // Basic HTML to Markdown (simplified)
      let md = html
          .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
          .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
          .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
          .replace(/<b>(.*?)<\/b>/g, '**$1**')
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<i>(.*?)<\/i>/g, '*$1*')
          .replace(/<u>(.*?)<\/u>/g, '__$1__')
          .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
          .replace(/<ul>(.*?)<\/ul>/g, '$1\n')
          .replace(/<li>(.*?)<\/li>/g, '- $1\n')
          .replace(/<br>/g, '\n')
          .replace(/<[^>]*>/g, ''); 

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.md';
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#13161c] relative group">
       {/* 1. Formatting Toolbar (Fixed Top) */}
       <div className="h-12 border-b border-[#1e1e1e] bg-[#0b0f13] flex items-center px-4 justify-between flex-shrink-0 z-10">
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
             suppressContentEditableWarning={true}
             onInput={updateStats}
             spellCheck={false}
             className="prose prose-invert max-w-3xl mx-auto focus:outline-none min-h-[500px] text-gray-200 leading-relaxed"
             onKeyDown={(e) => {
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
            className="ai-toolbar fixed z-50 flex flex-col bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200 w-[320px] origin-center"
            style={{ 
                top: toolbarPosition.top, 
                left: toolbarPosition.left,
                // If placement is top, we translate Y -100% to sit ABOVE the coordinate
                transform: toolbarPosition.placement === 'top' ? 'translateY(-100%)' : 'none'
            }}
          >
             {/* AI Header */}
             <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252525] rounded-t-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                    <Wand2 size={12} /> 
                    {activeSubMenu === 'main' ? 'AI Edit' : activeSubMenu === 'tone' ? 'Change Tone' : 'Translate'}
                </div>
                {isProcessing && <span className="text-[10px] text-gray-400 animate-pulse">Processing...</span>}
             </div>

             {/* SUB-MENU: MAIN */}
             {activeSubMenu === 'main' && (
                 <>
                    <div className="p-1 grid grid-cols-4 gap-1">
                        <button onClick={() => handleAiAction('fix')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Fix Grammar">
                            <Check size={14} className="text-green-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-gray-400">Fix</span>
                        </button>
                        <button onClick={() => handleAiAction('optimize')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Optimize">
                            <Type size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-gray-400">Polish</span>
                        </button>
                        <button onClick={() => handleAiAction('expand')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Expand">
                            <Maximize2 size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-gray-400">Expand</span>
                        </button>
                        <button onClick={() => handleAiAction('shorten')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group" title="Shorten">
                            <Minimize2 size={14} className="text-orange-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-gray-400">Shorten</span>
                        </button>
                    </div>

                    <div className="border-t border-[#333] my-0.5"></div>
                    
                    {/* Navigation to Sub-menus */}
                    <div className="p-1 space-y-0.5">
                        <button onClick={() => setActiveSubMenu('tone')} className="w-full flex items-center justify-between p-2 hover:bg-[#333] rounded text-xs text-gray-300">
                             <div className="flex items-center gap-2"><Smile size={14} className="text-yellow-500"/> Change Tone</div>
                             <ChevronRight size={12} />
                        </button>
                        <button onClick={() => setActiveSubMenu('translate')} className="w-full flex items-center justify-between p-2 hover:bg-[#333] rounded text-xs text-gray-300">
                             <div className="flex items-center gap-2"><Languages size={14} className="text-cyan-500"/> Translate</div>
                             <ChevronRight size={12} />
                        </button>
                    </div>
                 </>
             )}

             {/* SUB-MENU: TONE */}
             {activeSubMenu === 'tone' && (
                 <div className="p-1 grid grid-cols-3 gap-1 mb-1">
                     <button onClick={() => handleAiAction('tone_professional')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group">
                         <Briefcase size={14} className="text-gray-300 group-hover:text-blue-300" />
                         <span className="text-[10px] text-gray-400">Pro</span>
                     </button>
                     <button onClick={() => handleAiAction('tone_casual')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group">
                         <Coffee size={14} className="text-gray-300 group-hover:text-orange-300" />
                         <span className="text-[10px] text-gray-400">Casual</span>
                     </button>
                     <button onClick={() => handleAiAction('tone_friendly')} className="flex flex-col items-center justify-center p-2 hover:bg-[#333] rounded gap-1 group">
                         <Smile size={14} className="text-gray-300 group-hover:text-yellow-300" />
                         <span className="text-[10px] text-gray-400">Friendly</span>
                     </button>
                     <button onClick={() => setActiveSubMenu('main')} className="col-span-3 mt-1 text-[10px] text-gray-500 hover:text-white p-1 text-center border-t border-[#333]">
                         Back
                     </button>
                 </div>
             )}

             {/* SUB-MENU: TRANSLATE */}
             {activeSubMenu === 'translate' && (
                 <div className="p-1 grid grid-cols-2 gap-1 mb-1">
                     <button onClick={() => handleAiAction('translate_en')} className="p-2 hover:bg-[#333] rounded text-xs text-gray-300">English</button>
                     <button onClick={() => handleAiAction('translate_zh')} className="p-2 hover:bg-[#333] rounded text-xs text-gray-300">Chinese</button>
                     <button onClick={() => handleAiAction('translate_ja')} className="p-2 hover:bg-[#333] rounded text-xs text-gray-300">Japanese</button>
                     <button onClick={() => handleAiAction('translate_es')} className="p-2 hover:bg-[#333] rounded text-xs text-gray-300">Spanish</button>
                     <button onClick={() => setActiveSubMenu('main')} className="col-span-2 mt-1 text-[10px] text-gray-500 hover:text-white p-1 text-center border-t border-[#333]">
                         Back
                     </button>
                 </div>
             )}

             {/* Custom Input */}
             {activeSubMenu === 'main' && (
                 <div className="p-2 border-t border-[#333] flex gap-2">
                     <div className="relative flex-1">
                         <Terminal size={12} className="absolute left-2 top-2.5 text-gray-500" />
                         <input 
                            type="text" 
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiAction('custom', customPrompt)}
                            placeholder="Ask AI to..."
                            className="w-full bg-[#13161c] border border-[#333] rounded pl-7 pr-2 py-1.5 text-xs text-gray-200 focus:border-purple-500 outline-none"
                         />
                     </div>
                     <button 
                        disabled={!customPrompt.trim()}
                        onClick={() => handleAiAction('custom', customPrompt)}
                        className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
                     >
                         <Send size={12} />
                     </button>
                 </div>
             )}
          </div>
       )}

       {/* 4. Slash Command Menu */}
       {slashMenuPos && (
           <div 
             className="fixed z-50 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl w-64 overflow-hidden animate-in fade-in duration-100"
             style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
           >
               <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-[#252525]">
                   Basic Blocks
               </div>
               <div className="py-1">
                   {filteredCommands.map((cmd, idx) => (
                       <button
                         key={cmd.id}
                         onClick={() => executeSlashCommand(cmd)}
                         className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${idx === slashSelectedIndex ? 'bg-blue-600/20 text-blue-100' : 'hover:bg-[#333] text-gray-300'}`}
                       >
                           <div className="p-1 rounded bg-[#333] border border-[#444] text-gray-300">
                               {cmd.icon}
                           </div>
                           <div>
                               <div className="text-sm font-medium">{cmd.label}</div>
                               <div className="text-[10px] text-gray-500">{cmd.desc}</div>
                           </div>
                       </button>
                   ))}
                   {filteredCommands.length === 0 && (
                       <div className="px-3 py-2 text-xs text-gray-500">No commands found</div>
                   )}
               </div>
           </div>
       )}
    </div>
  );
};

export default DocumentEditor;
