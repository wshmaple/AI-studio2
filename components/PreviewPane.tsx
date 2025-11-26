import React, { useEffect, useState } from 'react';
import { FileData } from '../types';

interface PreviewPaneProps {
  files: FileData[];
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ files }) => {
  const [iframeSrc, setIframeSrc] = useState<string>('');

  useEffect(() => {
    const processFiles = () => {
      // 1. Create a map of file paths to Blob URLs
      // We do a two-pass approach:
      // Pass A: Create Blobs for everything initially so we have URLs.
      // Pass B: Rewrite JS files to use those URLs for imports, then update the Blob for that JS file.
      // Note: Updating the Blob generates a NEW URL. This is tricky for circular deps or deep chains.
      // For this simple replica, we'll assume a flat structure or simple imports.
      
      const fileUrlMap = new Map<string, string>();
      const cleanupUrls: string[] = [];

      // Helper to create blob and store URL
      const createAndStoreBlob = (path: string, content: string, type: string) => {
          const blob = new Blob([content], { type });
          const url = URL.createObjectURL(blob);
          fileUrlMap.set(path, url);
          cleanupUrls.push(url);
          return url;
      };

      // Initial Pass
      files.forEach(file => {
        let type = 'text/plain';
        if (file.path.endsWith('.html')) type = 'text/html';
        else if (file.path.endsWith('.css')) type = 'text/css';
        else if (file.path.endsWith('.js') || file.path.endsWith('.mjs')) type = 'application/javascript';
        else if (file.path.endsWith('.json')) type = 'application/json';
        
        createAndStoreBlob(file.path, file.content, type);
      });

      // Second Pass: Rewrite JS Imports
      // We iterate and if we modify code, we update the URL in the map.
      // ideally we should do this in topological order, but for now linear scan.
      files.forEach(file => {
          if (file.path.endsWith('.js') || file.path.endsWith('.mjs') || file.path.endsWith('.ts')) {
              let newContent = file.content;
              let changed = false;

              // Replace static imports: import ... from './style.css' or 'style.css'
              newContent = newContent.replace(/from\s+['"]([^'"]+)['"]/g, (match, importPath) => {
                  // Normalize path (remove ./ prefix)
                  const cleanPath = importPath.startsWith('./') ? importPath.slice(2) : importPath;
                  const targetUrl = fileUrlMap.get(cleanPath);
                  if (targetUrl) {
                      changed = true;
                      return `from '${targetUrl}'`;
                  }
                  return match;
              });

               // Handle dynamic imports: import('./...')
               newContent = newContent.replace(/import\(['"]([^'"]+)['"]\)/g, (match, importPath) => {
                  const cleanPath = importPath.startsWith('./') ? importPath.slice(2) : importPath;
                  const targetUrl = fileUrlMap.get(cleanPath);
                  if (targetUrl) {
                      changed = true;
                      return `import('${targetUrl}')`;
                  }
                  return match;
              });

              if (changed) {
                  // We must revoke the old URL to avoid leaks, though we store all in cleanupUrls to be safe at end
                  // But critically, we update the map so HTML that references this JS gets the NEW URL.
                  createAndStoreBlob(file.path, newContent, 'application/javascript');
              }
          }
      });

      // 3. Construct the Entry Point (index.html)
      const indexHtml = files.find(f => f.path === 'index.html' || f.path === 'index.htm');
      
      if (!indexHtml) {
        setIframeSrc('data:text/html;charset=utf-8,<html><body style="color:#888;font-family:sans-serif;padding:20px;text-align:center;">No index.html found</body></html>');
        return;
      }

      let finalHtml = indexHtml.content;

      // Replace <link rel="stylesheet" href="...">
      finalHtml = finalHtml.replace(/<link\s+[^>]*href=['"]([^'"]+)['"][^>]*>/g, (match, hrefPath) => {
          const cleanPath = hrefPath.startsWith('./') ? hrefPath.slice(2) : hrefPath;
          const url = fileUrlMap.get(cleanPath);
          return url ? match.replace(hrefPath, url) : match;
      });
      
      // Replace <script src="...">
      finalHtml = finalHtml.replace(/<script\s+[^>]*src=['"]([^'"]+)['"][^>]*>/g, (match, srcPath) => {
          const cleanPath = srcPath.startsWith('./') ? srcPath.slice(2) : srcPath;
          const url = fileUrlMap.get(cleanPath);
          return url ? match.replace(srcPath, url) : match;
      });
      
      // Replace img src="..." just in case
      finalHtml = finalHtml.replace(/<img\s+[^>]*src=['"]([^'"]+)['"][^>]*>/g, (match, srcPath) => {
          const cleanPath = srcPath.startsWith('./') ? srcPath.slice(2) : srcPath;
          const url = fileUrlMap.get(cleanPath);
          return url ? match.replace(srcPath, url) : match;
      });

      // Create final blob for iframe
      const finalBlob = new Blob([finalHtml], { type: 'text/html' });
      const finalUrl = URL.createObjectURL(finalBlob);
      setIframeSrc(finalUrl);

      return () => {
          cleanupUrls.forEach(url => URL.revokeObjectURL(url));
          URL.revokeObjectURL(finalUrl);
      };
    };

    const cleanup = processFiles();
    return () => {
        if (cleanup) cleanup();
    };
  }, [files]);

  return (
    <div className="w-full h-full bg-white">
      <iframe 
        src={iframeSrc}
        title="preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-popups"
      />
    </div>
  );
};

export default PreviewPane;