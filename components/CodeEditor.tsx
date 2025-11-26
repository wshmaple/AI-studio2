import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, language, onChange, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      Prism.highlightElement(preRef.current);
    }
  }, [code, language]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="relative w-full h-full font-mono text-sm bg-[#1e1e1e] overflow-hidden group">
      {/* Background Syntax Highlighted Layer */}
      <pre 
        ref={preRef}
        aria-hidden="true" 
        className={`absolute inset-0 m-0 p-4 pointer-events-none overflow-hidden language-${language}`}
        style={{ zIndex: 1 }}
      >
        <code className={`language-${language}`}>{code}</code>
      </pre>

      {/* Foreground Editable Textarea */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleInput}
        onScroll={handleScroll}
        spellCheck={false}
        disabled={readOnly}
        className="absolute inset-0 w-full h-full m-0 p-4 bg-transparent text-transparent caret-white resize-none outline-none z-10 font-mono"
        style={{ color: 'transparent', whiteSpace: 'pre' }} 
      />
    </div>
  );
};

export default CodeEditor;
