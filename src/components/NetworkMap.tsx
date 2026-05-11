import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { User, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ReferralNode {
  id: string;
  name: string;
  nickname: string;
  careerLevel?: string;
  children?: ReferralNode[];
}

interface NetworkMapProps {
  data: ReferralNode;
  onSelect?: (node: any) => void;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({ data, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const root = useMemo(() => d3.hierarchy(data), [data]);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 1000;
    const height = 600;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "width: 100%; height: auto; font: 10px sans-serif;");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
      
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior as any);

    const tree = d3.tree<ReferralNode>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    tree(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x))
      .attr("fill", "none")
      .attr("stroke", "rgba(59, 130, 246, 0.2)")
      .attr("stroke-width", 2);

    // Nodes
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        if (onSelect) onSelect(d.data);
      });

    nodes.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => {
        if (d.depth === 0) return "#3b82f6";
        if (d.data.careerLevel === 'CEO_PLE') return "#facc15";
        if (d.data.careerLevel === 'PRESIDENTE') return "#ef4444";
        if (d.data.careerLevel === 'VICE_PRESIDENTE') return "#8b5cf6";
        if (d.data.careerLevel === 'BLACK_DIAMANTE') return "#06b6d4";
        if (d.data.careerLevel === 'DIAMANTE') return "#10b981";
        if (d.data.careerLevel === 'EXECUTIVO_4') return "#f97316";
        if (d.data.careerLevel === 'EXECUTIVO_3') return "#ec4899";
        if (d.data.careerLevel === 'EXECUTIVO_2') return "#94a3b8";
        if (d.data.careerLevel === 'EXECUTIVO_1') return "#b45309";
        return "#1e293b";
      })
      .attr("stroke", (d: any) => d.depth === 0 ? "#fff" : "rgba(255,255,255,0.2)")
      .attr("stroke-width", 2);

    nodes.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: any) => d.children ? -12 : 12)
      .attr("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => d.data.nickname || d.data.name.split(' ')[0])
      .attr("fill", "#fff")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.5)");

    // Initial zoom to fit
    svg.transition().duration(750).call(
      zoomBehavior.transform as any,
      d3.zoomIdentity.translate(margin.left, margin.top).scale(1)
    );

  }, [root]);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(750).call(
      zoomBehaviorRef.current.transform as any,
      d3.zoomIdentity.translate(120, 40).scale(1)
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
    <div className="relative w-full overflow-hidden bg-[var(--bg-sidebar)] rounded-3xl border border-[var(--border-main)] p-8" ref={containerRef}>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
            <User size={20} />
          </div>
          <div>
            <h4 className="text-[var(--text-main)] font-bold uppercase tracking-tighter">Mapa Visual da Rede</h4>
            <p className="text-[var(--text-muted)] text-[10px] uppercase font-mono tracking-widest">Visualização Hierárquica D3.js</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleResetZoom}
            className="p-2 bg-[var(--bg-sidebar)] backdrop-blur-md border border-[var(--border-main)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
            title="Resetar Zoom"
          >
            <Maximize2 size={18} />
          </button>
          <div className="flex bg-[var(--bg-sidebar)] backdrop-blur-md border border-[var(--border-main)] rounded-lg overflow-hidden">
            <button onClick={handleZoomIn} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] border-r border-[var(--border-main)] transition-all"><ZoomIn size={18} /></button>
            <button onClick={handleZoomOut} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"><ZoomOut size={18} /></button>
          </div>
        </div>
      </div>
      <div className="flex justify-center w-full h-[500px] cursor-move">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};
