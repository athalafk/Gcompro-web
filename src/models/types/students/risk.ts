export type PrereqNode = {
  id: string;
  data: { label: string };
  status: "passed" | "failed" | "current" | "none";
};

export type RiskLevel = "LOW" | "MED" | "HIGH";
export type PrereqLink = { source: string; target: string };
export type PrereqMap = { nodes: PrereqNode[]; links: PrereqLink[] };

export type AIRawResult = {
  prediction: string;
  probabilities?: Record<string, number>;
};
