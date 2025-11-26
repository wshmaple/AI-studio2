import React from 'react';
import { FileData } from '../types';
import { FileCode, FileJson, FileType, File } from 'lucide-react';

interface FileExplorerProps {
  files: FileData[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

const getFileIcon = (path: string) => {
  if (path.endsWith('.html')) return <FileCode size={14} className="text-orange-400" />;
  if (path.endsWith('.css')) return <FileType size={14} className="text-blue-400" />;
  if (path.endsWith('.js') || path.endsWith('.ts')) return <FileCode size={14} className="text-yellow-400" />;
  if (path.endsWith('.json')) return <FileJson size={14} className="text-green-400" />;
  return <File size={14} className="text-gray-400" />;
};

const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile }) => {
  return (
    <div className="h-full flex flex-col bg-[#0b0f13]">
      <div className="p-3 text-xs font-semibold text-gray-500 tracking-wider uppercase">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto px-2">
         <div className="space-y-0.5">
            {files.map(f => (
              <div 
                key={f.path}
                onClick={() => onSelectFile(f.path)}
                className={`flex items-center gap-2 p-1.5 rounded-sm cursor-pointer text-sm transition-colors ${
                  selectedFile === f.path ? 'bg-[#2a2d35] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e1e1e]'
                }`}
              >
                {getFileIcon(f.path)}
                <span className="truncate">{f.path}</span>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default FileExplorer;