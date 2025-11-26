import React, { useMemo } from 'react';
import { FileData } from '../types';

interface PreviewPaneProps {
  files: FileData[];
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ files }) => {
  const srcDoc = useMemo(() => {
    const indexHtml = files.find(f => f.path === 'index.html' || f.path === 'index.htm');
    if (!indexHtml) return '<div style="color:white; font-family:sans-serif; padding:20px;">No index.html found</div>';

    let content = indexHtml.content;

    // Inject CSS
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    cssFiles.forEach(css => {
       const tag = `<style>${css.content}</style>`;
       content = content.replace('</head>', `${tag}</head>`);
    });

    // Inject JS
    const jsFiles = files.filter(f => f.path.endsWith('.js'));
    jsFiles.forEach(js => {
       const tag = `<script>${js.content}</script>`;
       content = content.replace('</body>', `${tag}</body>`);
    });

    return content;
  }, [files]);

  return (
    <div className="w-full h-full bg-white">
      <iframe 
        srcDoc={srcDoc}
        title="preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts"
      />
    </div>
  );
};

export default PreviewPane;
