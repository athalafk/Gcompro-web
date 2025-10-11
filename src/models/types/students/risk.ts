import { RiskLevel } from "../auth/auth";

export type PrereqNode = { 
  id: string; 
  data: { label: string }; 
  status: 'passed' | 'failed' | 'current' | 'none' 
};

export type PrereqLink = { source: string; target: string };

export type AIResult = { 
    risk_level: RiskLevel; 
    cluster_label: number;
    distance: number;
    reasons: string[];
    actions: string[];
};

export type PrereqMap = { nodes: PrereqNode[]; links: PrereqLink[] };

export type Features = {
  gpa_cum: number; ips_last: number; delta_ips: number;
  mk_gagal_total: number; sks_tunda: number; pct_d: number; pct_e: number; repeat_count: number;
};