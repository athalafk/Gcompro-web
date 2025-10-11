export const studentSchemas = {
  GradeBucket: {
    type: "object",
    properties: {
      grade_index: { type: "string", enum: ["A", "B", "C", "D", "E"] },
      count: { type: "integer" }
    }
  },
  PrereqNode: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      data: { type: "object", properties: { label: { type: "string" } } },
      status: { type: "string", enum: ["passed", "failed", "current", "none"] }
    }
  },
  PrereqLink: {
    type: "object",
    properties: {
      source: { type: "string", format: "uuid" },
      target: { type: "string", format: "uuid" }
    }
  }
};