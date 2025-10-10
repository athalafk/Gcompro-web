"use client";
import React, { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

type NodeStatus = "passed"|"failed"|"current"|"none";
type Node = { id: string; data: { label: string }; status: NodeStatus };
type Link = { source: string; target: string };

export default function PrereqGraph({ nodes, links }:{ nodes:Node[], links:Link[] }) {
  const rfNodes = useMemo(()=> nodes.map((n,i)=>({
    id:n.id, data:{label:n.data.label},
    position:{ x:(i%4)*260, y:Math.floor(i/4)*140 },
    style:{
      borderRadius:12, padding:10,
      background: n.status==="passed" ? "#D1FAE5"
        : n.status==="failed" ? "#FEE2E2"
        : n.status==="current"? "#FEF3C7" : "#E5E7EB",
      border:"1px solid #CBD5E1"
    }
  })),[nodes]);

  const rfEdges = useMemo(()=> links.map((e,i)=>({
    id:String(i), source:e.source, target:e.target, style:{ stroke:"#9CA3AF" }
  })),[links]);

  return (
    <div className="h-[520px] w-full rounded-2xl border">
      <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
