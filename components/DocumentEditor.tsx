import React, { useRef, useState, useEffect } from 'react';
import { Wand2, AlignLeft, Check, Maximize2, Minimize2 } from 'lucide-react';

interface DocumentEditorProps {
  initialContent?: string;
  onAiTransform: (text: string, operation: 'optimize' | 'fix' | 'expand' | 'shorten') => Promise<string>;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ initialContent = "<h1>Project Solution Draft</h1><p>Select text here to see AI magic options...</p>", onAiTransform }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
          // Calculate relative position within the editor container
          // We use fixed positioning for the toolbar to make it easier, 
          // but we need to ensure it's calculated correctly relative to viewport
          setToolbarPosition({
            top: rect.top - 50, // Position above selection
            left: rect.left + (rect.width / 2) - 100 // Center horizontally approx
          });
          setSelectedText(text);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection); // Handle shift+arrow selection

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  const handleAction = async (operation: 'optimize' | 'fix' | 'expand' | 'shorten') => {
    if (!selectedText || isProcessing) return;
    
    setIsProcessing(true);
    try {
        const newText = await onAiTransform(selectedText, operation);
        
        // Replace text in contentEditable
        // This is a bit tricky with contentEditable standard APIs, simplified here
        document.execCommand('insertText', false, newText);
        
        // Clear selection UI
        setToolbarPosition(null);
        window.getSelection()?.removeAllRanges();
    } catch (e) {
        console.error("AI Transform failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#13161c] relative">
       {/* Toolbar */}
       <div className="h-12 border-b border-[#1e1e1e] bg-[#0b0f13] flex items-center px-4 justify-between">
           <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-200">AI Document Editor</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">Beta</span>
           </div>
           <div className="text-xs text-gray-500">
              Highlight text to trigger AI
           </div>
       </div>

       {/* Editor Area */}
       <div className="flex-1 overflow-y-auto p-8">
          <div 
             ref={contentRef}
             contentEditable
             suppressContentEditableWarning
             className="prose prose-invert max-w-2xl mx-auto focus:outline-none min-h-[500px]"
             dangerouslySetInnerHTML={{ __html: initialContent }}
          />
       </div>

       {/* Floating Magic Toolbar */}
       {toolbarPosition && (
          <div 
            className="fixed z-50 flex items-center gap-1 p-1 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
          >
             {isProcessing ? (
                <div className="flex items-center gap-2 px-3 py-1.5">
                   <Wand2 size={14} className="animate-spin text-purple-400" />
                   <span className="text-xs text-gray-300">Generating...</span>
                </div>
             ) : (
                <>
                    <button onClick={() => handleAction('fix')} className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#333] rounded text-xs text-gray-300 transition-colors" title="Fix Grammar">
                        <Check size={12} className="text-green-400" /> Fix
                    </button>
                    <button onClick={() => handleAction('optimize')} className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#333] rounded text-xs text-gray-300 transition-colors" title="Optimize Wording">
                        <Wand2 size={12} className="text-purple-400" /> Optimize
                    </button>
                    <button onClick={() => handleAction('expand')} className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#333] rounded text-xs text-gray-300 transition-colors" title="Expand Text">
                        <Maximize2 size={12} className="text-blue-400" /> Expand
                    </button>
                    <button onClick={() => handleAction('shorten')} className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#333] rounded text-xs text-gray-300 transition-colors" title="Shorten Text">
                        <Minimize2 size={12} className="text-orange-400" /> Shorten
                    </button>
                </>
             )}
          </div>
       )}
    </div>
  );
};

export default DocumentEditor;