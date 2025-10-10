import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: { title: "GCompro Swagger API", version: "0.1" },
      servers: [{ url: "http://localhost:3000" }],
      components: {
        schemas: {
          GradeBucket: {
            type: "object",
            properties: {
              grade_index: { type: "string", enum: ["A","B","C","D","E"] },
              count: { type: "integer" }
            }
          },
          Features: {
            type: "object",
            properties: {
              gpa_cum: { type: "number", format: "float" },
              ips_last: { type: "number", format: "float" },
              delta_ips:{ type: "number", format: "float" },
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
              risk_level: { type: "string", enum: ["LOW","MED","HIGH"] },
              reasons: { type: "array", items: { type: "string" } },
              actions: { type: "array", items: { type: "string" } }
            }
          },
          PrereqNode: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              data: { type: "object", properties: { label: { type: "string" } } },
              status: { type: "string", enum: ["passed","failed","current","none"] }
            }
          },
          PrereqLink: {
            type: "object",
            properties: {
              source: { type: "string", format: "uuid" },
              target: { type: "string", format: "uuid" }
            }
          }
        }
      }
    },
  });
  return spec;
};