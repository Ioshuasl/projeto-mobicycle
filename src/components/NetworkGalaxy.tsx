import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { User, ZoomIn, ZoomOut, Maximize2, Info, Trophy } from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  nickname: string;
  status: string;
  careerLevel?: string;
  avatar?: string;
  referralsCount: number;
  children?: NetworkNode[];
}

interface NetworkGalaxyProps {
  data: NetworkNode;
  onSelect?: (node: any) => void;
}

export const NetworkGalaxy: React.FC<NetworkGalaxyProps> = ({ data, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Memoize the hierarchy to avoid recalculating on every render
  const root = useMemo(() => d3.hierarchy(data), [data]);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 1000;
    const height = 1000;
    const radius = Math.min(width, height) / 2 - 100;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "width: 100%; height: auto; font: 10px sans-serif;");

    const g = svg.append("g");

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoom(event.transform.k);
        
        // Semantic zooming: hide text when zoomed out too far to improve performance
        if (event.transform.k < 0.5) {
          g.selectAll("text").style("opacity", 0);
        } else {
          g.selectAll("text").style("opacity", 1);
        }
      });
      
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior as any);

    const tree = d3.tree<NetworkNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    tree(root);

    // Links with glow effect - optimized rendering
    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke", "rgba(59, 130, 246, 0.15)")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", d3.linkRadial<any, any>()
        .angle((d: any) => d.x)
        .radius((d: any) => d.y));

    // Nodes - optimized rendering
    const node = g.append("g")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .on("click", (event, d: any) => {
        if (onSelect) onSelect(d.data);
        event.stopPropagation();
      })
      .style("cursor", "pointer");

    // Node circles with gradients
    node.append("circle")
      .attr("r", (d: any) => d.depth === 0 ? 12 : Math.max(2, 6 - d.depth))
      .attr("fill", (d: any) => {
        if (d.depth === 0) return "#3b82f6";
        if (d.data.careerLevel === 'CEO_PLE') return "#facc15"; // CEO PLE (Yellow)
        if (d.data.careerLevel === 'PRESIDENTE') return "#ef4444"; // Royal Black-Diamond (Red)
        if (d.data.careerLevel === 'VICE_PRESIDENTE') return "#8b5cf6"; // Black Diamond (Purple)
        if (d.data.careerLevel === 'BLACK_DIAMANTE') return "#06b6d4"; // Duplo Diamante (Cyan)
        if (d.data.careerLevel === 'DIAMANTE') return "#10b981"; // Diamante (Emerald)
        if (d.data.careerLevel === 'EXECUTIVO_4') return "#f97316"; // Esmeralda (Orange)
        if (d.data.careerLevel === 'EXECUTIVO_3') return "#ec4899"; // Ouro (Pink)
        if (d.data.careerLevel === 'EXECUTIVO_2') return "#94a3b8"; // Prata (Slate)
        if (d.data.careerLevel === 'EXECUTIVO_1') return "#b45309"; // Bronze (Amber)
        return "#1e293b";
      })
      .attr("stroke", (d: any) => d.depth === 0 ? "rgba(255,255,255,0.5)" : "rgba(59, 130, 246, 0.3)")
      .attr("stroke-width", 1.5);

    // Node glow
    node.append("circle")
      .attr("r", (d: any) => (d.depth === 0 ? 12 : Math.max(2, 6 - d.depth)) + 4)
      .attr("fill", "transparent")
      .attr("stroke", (d: any) => {
        if (d.depth === 0) return "rgba(59, 130, 246, 0.2)";
        if (d.data.careerLevel === 'DIAMANTE') return "rgba(16, 185, 129, 0.2)";
        return "rgba(59, 130, 246, 0.1)";
      })
      .attr("stroke-width", 1);

    // Labels - only for depth <= 3 to improve performance on large trees
    const labels = node.filter((d: any) => d.depth <= 3).append("text")
      .attr("transform", (d: any) => d.x < Math.PI ? "rotate(0)" : "rotate(180)")
      .attr("dy", "0.31em")
      .attr("x", (d: any) => d.x < Math.PI === !d.children ? 10 : -10)
      .attr("text-anchor", (d: any) => d.x < Math.PI === !d.children ? "start" : "end")
      .text((d: any) => d.data.nickname || d.data.name.split(' ')[0])
      .attr("fill", (d: any) => d.depth === 0 ? "#fff" : "rgba(255,255,255,0.7)")
      .attr("font-size", (d: any) => d.depth === 0 ? "12px" : "8px")
      .attr("font-weight", (d: any) => d.depth === 0 ? "bold" : "normal");
      
    labels.clone(true).lower()
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 3);

    // Initial zoom to fit
    svg.transition().duration(750).call(
      zoomBehavior.transform as any,
      d3.zoomIdentity.translate(0, 0).scale(0.8)
    );

  }, [root]);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(750).call(
      zoomBehaviorRef.current.transform as any,
      d3.zoomIdentity.translate(0, 0).scale(0.8)
    );
  };

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy as any, 1.5
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy as any, 0.75
    );
  };


  return (
    <div className="relative w-full h-[600px] bg-[#050505] rounded-[2.5rem] border border-[var(--border-main)] overflow-hidden group shadow-2xl" ref={containerRef}>
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Galaxy Header */}
      <div className="absolute top-8 left-8 z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/20">
            <Trophy size={16} />
          </div>
          <h4 className="text-[var(--text-main)] font-bold text-lg tracking-tight">Galáxia de Indicações</h4>
        </div>
        <p className="text-[var(--text-muted)] text-[10px] uppercase font-mono tracking-[0.2em]">Visualização Radial Interativa</p>
      </div>

      {/* Controls */}
      <div className="absolute top-8 right-8 z-10 flex flex-col gap-2">
        <button 
          onClick={handleResetZoom}
          className="p-2 bg-[var(--bg-sidebar)] backdrop-blur-md border border-[var(--border-main)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
          title="Resetar Zoom"
        >
          <Maximize2 size={18} />
        </button>
        <div className="flex flex-col bg-[var(--bg-sidebar)] backdrop-blur-md border border-[var(--border-main)] rounded-lg overflow-hidden">
          <button onClick={handleZoomIn} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] border-b border-[var(--border-main)] transition-all"><ZoomIn size={18} /></button>
          <button onClick={handleZoomOut} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"><ZoomOut size={18} /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-8 z-10 flex flex-wrap max-w-[300px] items-center gap-4 px-6 py-3 bg-[var(--bg-sidebar)] backdrop-blur-md border border-[var(--border-main)] rounded-3xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Líder</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#b45309]" />
          <span className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Bronze</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#94a3b8]" />
          <span className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Prata</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ec4899]" />
          <span className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Ouro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="text-[9px] text-[var(--text-muted)] uppercase font-mono">Diamante</span>
        </div>
      </div>

      {/* Main SVG */}
      <svg 
        ref={svgRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
