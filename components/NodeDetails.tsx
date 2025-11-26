import React from 'react';
import { CanvasNode } from '../types';
import { X, FileCode, User, Bot, Wrench, Copy, History } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface NodeDetailsProps {
  node: CanvasNode;
  onClose: () => void;
  onRestore?: () => void; // New prop for navigation
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose, onRestore }) => {
  const getIcon = () => {
    switch (node.type) {
      case 'user': return <User size={20} className="text-blue-400" />;
      case 'model': return <Bot size={20} className="text-purple-400" />;
      case 'file': return <FileCode size={20} className="text-green-400" />;
      case 'tool': return <Wrench size={20} className="text-orange-400" />;
      default: return <Bot size={20} />;
    }
  };

  const getTypeLabel = () => {
    switch (node.type) {
      case 'user': return 'User Input';
      case 'model': return 'Model Output';
      case 'file': return 'Generated File';
      case 'tool': return 'Tool Execution';
      default: return 'Node';
    }
  };

  const formatContent = (content: string) => {
    try {
        if (node.type === 'tool') {
            return JSON.stringify(JSON.parse(content), null, 2);
        }
    } catch (e) {
        // ignore
    }
    return content;
  };

  const content = formatContent(node.data.details);
  const lang = node.type === 'tool' ? 'json' : (node.type === 'file' ? 'javascript' : 'markdown');

  return (
    <div className="absolute top-0 right-0 h-full w-[500px] bg-[#13161c] border-l border-[#333] shadow-2xl z-20 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#252525] border border-[#333]">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{node.data.label}</h3>
            <p className="text-xs text-gray-500">{getTypeLabel()}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#333] rounded-lg text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
         <div className="bg-[#1e1e1e] px-4 py-2 border-b border-[#333] flex justify-between items-center">
             <span className="text-xs font-mono text-gray-500">Raw Content</span>
             
             <div className="flex items-center gap-2">
                 {/* Restore Button for Chat Nodes */}
                 {(node.type === 'user' || node.type === 'model') && onRestore && (
                     <button 
                        onClick={onRestore}
                        className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/30 px-2 py-1 rounded border border-blue-900/50"
                        title="Restore conversation to this point"
                     >
                         <History size={10} /> Restore Context
                     </button>
                 )}
                 <button 
                    onClick={() => navigator.clipboard.writeText(content)}
                    className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white bg-[#2a2a2a] px-2 py-1 rounded border border-[#333]"
                 >
                     <Copy size={10} /> Copy
                 </button>
             </div>
         </div>
         <div className="flex-1 relative">
            <CodeEditor 
                code={content}
                language={lang}
                onChange={() => {}} 
                readOnly={true}
            />
         </div>
      </div>
    </div>
  );
};

export default NodeDetails;