import React, { useRef, useState, useEffect } from 'react';
import { CanvasNode, CanvasEdge } from '../types';

interface FlowCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ nodes, edges }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newScale = Math.max(0.1, Math.min(4, transform.scale - e.deltaY * 0.001));
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
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

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'user': return '#3b82f6';
      case 'model': return '#a855f7';
      case 'file': return '#10b981';
      case 'tool': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="w-full h-full bg-[#131313] overflow-hidden cursor-move relative">
      <div className="absolute top-4 left-4 z-10 bg-[#1e1e1e] p-2 rounded border border-[#333] text-xs text-gray-400">
        Agent Execution Flow
      </div>
      <svg 
        ref={svgRef}
        className="w-full h-full"
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

             const startX = source.x + 150; // Width of node / 2 (approx)
             const startY = source.y + 25;
             const endX = target.x;
             const endY = target.y + 25;

             return (
               <path 
                 key={edge.id}
                 d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`}
                 stroke="#4b5563"
                 strokeWidth="2"
                 fill="none"
               />
             );
          })}

          {/* Nodes */}
          {nodes.map(node => (
            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
               <rect 
                 width="150" 
                 height="50" 
                 rx="8" 
                 fill="#1e1e1e" 
                 stroke={getNodeColor(node.type)} 
                 strokeWidth="2"
               />
               <text x="10" y="20" fill="white" fontSize="10" fontWeight="bold">{node.type.toUpperCase()}</text>
               <text x="10" y="35" fill="#ccc" fontSize="10">
                 {node.data.label.length > 20 ? node.data.label.substring(0,18) + '...' : node.data.label}
               </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default FlowCanvas;
