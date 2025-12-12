export type PrereqNode = {
  id: string;
  data: { label: string };
  status: "passed" | "failed" | "current" | "none";
  semester_plan: number | null;
};

export type RiskLevel = "LOW" | "MED" | "HIGH";
export type PrereqLink = { source: string; target: string };
export type PrereqMap = { nodes: PrereqNode[]; links: PrereqLink[] };

export type AIRawResult = {
  prediction: string;
  probabilities?: Record<string, number>;
};

export type RequisiteItem = {
  code: string;
  name: string;
};

export type CourseMapNode = {
  code: string;
  name: string;
  sks: number;
  semester_plan: number | null;
  prereq: RequisiteItem[];
  corereq: RequisiteItem[];
  kelulusan: "Lulus" | "Tidak Lulus" | "Belum Lulus";
  mk_pilihan?: boolean;
  min_index?: string;
  attributes?: { kategori: "Wajib" | "Pilihan" };
};

export type CoursesMapResponse = {
  curriculum_id: string;
  version: number;
  meta: { name: string; note?: string };
  nodes: CourseMapNode[];
};

export type AiPredictGraduationResponse = {
  status: string;
  color: string;
  description: string;
  stats: {
    sks_needed: number;
    semesters_left: number;
    required_pace: number;
    student_capacity: number;
  };
};