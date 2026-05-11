import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Shield, User, Crown, Star } from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  nickname: string;
  avatar?: string;
  matrixType?: 'ONBORD' | 'CASHBOARD' | null;
  matrixPosition?: number | null;
  referralsCount?: number;
  children?: NetworkNode[];
}

interface MatrixNetworkProps {
  data: NetworkNode;
  onSelect?: (node: any) => void;
}

export const MatrixNetwork: React.FC<MatrixNetworkProps> = ({ data, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const root = useMemo(() => d3.hierarchy(data), [data]);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 1200;
    const height = 800;
    const margin = { top: 100, right: 100, bottom: 100, left: 100 };

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "width: 100%; height: auto;");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    const tree = d3.tree<NetworkNode>().size([width - margin.left - margin.right, height - margin.top - margin.bottom]);
    tree(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .attr("fill", "none")
      .attr("stroke", "rgba(59, 130, 246, 0.15)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Nodes
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        if (onSelect) onSelect(d.data);
      });

    // Node Background Card
    nodes.append("rect")
      .attr("x", -70)
      .attr("y", -35)
      .attr("width", 140)
      .attr("height", 70)
      .attr("rx", 16)
      .attr("fill", (d: any) => {
        if (d.data.matrixType === 'CASHBOARD') return "rgba(234, 179, 8, 0.15)";
        if (d.data.matrixType === 'ONBORD') return "rgba(59, 130, 246, 0.15)";
        return "rgba(30, 41, 59, 0.8)";
      })
      .attr("stroke", (d: any) => {
        if (d.data.matrixType === 'CASHBOARD') return "rgba(234, 179, 8, 0.5)";
        if (d.data.matrixType === 'ONBORD') return "rgba(59, 130, 246, 0.5)";
        return "rgba(71, 85, 105, 0.3)";
      })
      .attr("stroke-width", 2);

    // Avatar Circle
    nodes.append("circle")
      .attr("cx", -40)
      .attr("cy", 0)
      .attr("r", 20)
      .attr("fill", "#0f172a")
      .attr("stroke", (d: any) => d.data.matrixType === 'CASHBOARD' ? "#eab308" : "#3b82f6")
      .attr("stroke-width", 2);

    // Matrix Position Badge
    nodes.filter((d: any) => d.data.matrixPosition)
      .append("circle")
      .attr("cx", 55)
      .attr("cy", -20)
      .attr("r", 12)
      .attr("fill", (d: any) => d.data.matrixType === 'CASHBOARD' ? "#eab308" : "#3b82f6")
      .attr("filter", "drop-shadow(0 0 4px rgba(0,0,0,0.5))");

    nodes.filter((d: any) => d.data.matrixPosition)
      .append("text")
      .attr("x", 55)
      .attr("y", -16)
      .attr("text-anchor", "middle")
      .attr("fill", (d: any) => d.data.matrixType === 'CASHBOARD' ? "#000" : "#fff")
      .attr("font-size", "10px")
      .attr("font-weight", "900")
      .text((d: any) => d.data.matrixPosition);

    // Name Text
    nodes.append("text")
      .attr("x", -15)
      .attr("y", -5)
      .attr("fill", "#fff")
      .attr("font-size", "11px")
      .attr("font-weight", "900")
      .attr("text-transform", "uppercase")
      .attr("letter-spacing", "-0.02em")
      .text((d: any) => d.data.nickname || d.data.name.split(' ')[0]);

    // Status Text
    nodes.append("text")
      .attr("x", -15)
      .attr("y", 12)
      .attr("fill", "rgba(255,255,255,0.5)")
      .attr("font-size", "8px")
      .attr("font-family", "monospace")
      .attr("text-transform", "uppercase")
      .attr("letter-spacing", "0.05em")
      .text((d: any) => d.data.matrixType ? `${d.data.matrixType}` : "Inativo");

    // Center view
    svg.transition().duration(750).call(
      zoom.transform as any,
      d3.zoomIdentity.translate(width/2 - margin.left, 50).scale(0.8)
    );

  }, [root, onSelect]);

  return (
    <div className="relative w-full overflow-hidden bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-main)] p-8" ref={containerRef}>
      <div className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-lg shadow-indigo-900/10">
            <Shield size={24} />
          </div>
          <div>
            <h4 className="text-[var(--text-main)] font-black uppercase tracking-tighter italic text-lg">Rede de Matrizes Cíclicas</h4>
            <p className="text-[var(--text-muted)] text-[10px] uppercase font-mono tracking-widest">Mapeamento de Posicionamento em Tempo Real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-main)] rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">On-Board</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Cash-Board</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[600px] cursor-move">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-2">
        <div className="p-4 bg-[var(--bg-sidebar)] backdrop-blur-md border border-[var(--border-main)] rounded-2xl max-w-xs">
          <p className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-2">Legenda de Posicionamento</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[8px] text-blue-400 font-bold">1</div>
              <span className="text-[8px] text-[var(--text-muted)] uppercase">Topo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[8px] text-blue-400 font-bold">2-3</div>
              <span className="text-[8px] text-[var(--text-muted)] uppercase">Meio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[8px] text-blue-400 font-bold">4-7</div>
              <span className="text-[8px] text-[var(--text-muted)] uppercase">Base</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
