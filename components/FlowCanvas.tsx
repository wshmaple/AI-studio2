import React, { useRef, useState, useEffect } from 'react';
import { CanvasNode, CanvasEdge } from '../types';
import { User, Bot, FileCode, Wrench, ZoomIn, ZoomOut, Maximize, MousePointer2 } from 'lucide-react';

interface FlowCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodeClick?: (node: CanvasNode) => void;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ nodes, edges, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Center view on load or when nodes change significantly
  useEffect(() => {
    if (nodes.length > 0) {
        // Simple auto-center logic for the last node
        const lastNode = nodes[nodes.length - 1];
        if (lastNode) {
            // Ideally we'd calculate bounding box, but centering roughly on last action helps
            // setTransform(prev => ({ ...prev, x: -lastNode.x + 200, y: -lastNode.y + 200 }));
        }
    }
  }, [nodes.length]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const newScale = Math.max(0.2, Math.min(3, transform.scale - e.deltaY * zoomSensitivity));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking on the background (SVG itself)
    if (e.target === svgRef.current) {
        setDragging(true);
        setLastPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleZoom = (factor: number) => {
     setTransform(prev => ({ ...prev, scale: Math.max(0.2, Math.min(3, prev.scale * factor)) }));
  };

  const handleReset = () => {
     setTransform({ x: 50, y: 50, scale: 1 });
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'user': return <User size={16} className="text-blue-400" />;
      case 'model': return <Bot size={16} className="text-purple-400" />;
      case 'file': return <FileCode size={16} className="text-green-400" />;
      case 'tool': return <Wrench size={16} className="text-orange-400" />;
      default: return <Bot size={16} />;
    }
  };

  const getNodeStyle = (type: string) => {
     const base = "w-full h-full rounded-lg border shadow-lg flex flex-col p-3 transition-all hover:ring-2 hover:ring-offset-1 hover:ring-offset-[#131313] cursor-pointer";
     switch (type) {
        case 'user': return `${base} bg-[#1e2530] border-blue-900/50 hover:ring-blue-500`;
        case 'model': return `${base} bg-[#251e30] border-purple-900/50 hover:ring-purple-500`;
        case 'file': return `${base} bg-[#1e3025] border-green-900/50 hover:ring-green-500`;
        case 'tool': return `${base} bg-[#30251e] border-orange-900/50 hover:ring-orange-500`;
        default: return `${base} bg-[#1e1e1e] border-gray-700 hover:ring-gray-500`;
     }
  };

  return (
    <div className="w-full h-full bg-[#0b0f13] overflow-hidden relative group">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', 
             backgroundSize: `${20 * transform.scale}px ${20 * transform.scale}px`,
             backgroundPosition: `${transform.x}px ${transform.y}px`
           }} 
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
         <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-1 flex flex-col gap-1 shadow-xl">
            <button onClick={() => handleZoom(1.2)} className="p-2 hover:bg-[#333] rounded text-gray-400 hover:text-white" title="Zoom In"><ZoomIn size={18} /></button>
            <button onClick={() => handleZoom(0.8)} className="p-2 hover:bg-[#333] rounded text-gray-400 hover:text-white" title="Zoom Out"><ZoomOut size={18} /></button>
            <button onClick={handleReset} className="p-2 hover:bg-[#333] rounded text-gray-400 hover:text-white" title="Reset View"><Maximize size={18} /></button>
         </div>
      </div>

      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[#1e1e1e]/80 backdrop-blur border border-[#333] px-3 py-1.5 rounded-full text-xs text-gray-400 flex items-center gap-2">
           <MousePointer2 size={12} />
           <span>Scroll to zoom • Drag to pan • Click nodes for details</span>
        </div>
      </div>

      <svg 
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {edges.map(edge => {
             const source = nodes.find(n => n.id === edge.source);
             const target = nodes.find(n => n.id === edge.target);
             if (!source || !target) return null;

             const startX = source.x + 180; // Node width approx
             const startY = source.y + 40; // Node height / 2 approx
             const endX = target.x;
             const endY = target.y + 40;

             return (
               <path 
                 key={edge.id}
                 d={`M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`}
                 stroke="#4b5563"
                 strokeWidth="2"
                 fill="none"
                 strokeDasharray="5,5"
                 className="animate-pulse"
                 style={{ animationDuration: '3s' }}
               />
             );
          })}

          {/* Nodes (ForeignObject for HTML/Tailwind) */}
          {nodes.map(node => (
            <foreignObject 
                key={node.id} 
                x={node.x} 
                y={node.y} 
                width="180" 
                height="80"
                className="overflow-visible"
            >
               <div 
                 onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}
                 className={getNodeStyle(node.type)}
               >
                  <div className="flex items-center gap-2 mb-2">
                     <div className="bg-black/20 p-1 rounded">
                       {renderIcon(node.type)}
                     </div>
                     <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 text-white">
                        {node.type}
                     </span>
                  </div>
                  <div className="text-xs text-gray-300 font-medium truncate leading-tight">
                     {node.data.label}
                  </div>
               </div>
            </foreignObject>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default FlowCanvas;