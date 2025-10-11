export const aiSchemas = {
  Features: {
    type: "object",
    properties: {
      gpa_cum: { type: "number", format: "float" },
      ips_last: { type: "number", format: "float" },
      delta_ips: { type: "number", format: "float" },
      mk_gagal_total: { type: "integer" },
      sks_tunda: { type: "integer" },
      pct_d: { type: "number", format: "float" },
      pct_e: { type: "number", format: "float" },
      repeat_count: { type: "integer" }
    }
  },
  AIResult: {
    type: "object",
    properties: {
      student_id: { type: "string", format: "uuid" },
      cluster_label: { type: "integer" },
      distance: { type: "number", format: "float" },
      risk_level: { type: "string", enum: ["LOW", "MED", "HIGH"] },
      reasons: { type: "array", items: { type: "string" } },
      actions: { type: "array", items: { type: "string" } }
    }
  }
};