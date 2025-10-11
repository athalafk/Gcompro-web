import { createSwaggerSpec } from "next-swagger-doc";
import { studentSchemas } from "./swagger-schemas/student-schema";
import { aiSchemas } from "./swagger-schemas/ai-schema";

const mergedSchemas = {
  ...studentSchemas,
  ...aiSchemas,
};

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: { title: "GCompro Swagger API", version: "0.1" },
      components: {
        schemas: mergedSchemas
      }
    },
  });
  return spec;
};