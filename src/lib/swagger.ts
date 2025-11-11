import { createSwaggerSpec } from "next-swagger-doc";
import { studentSchemas } from "./swagger-schemas/student-schema";
import { aiSchemas } from "./swagger-schemas/ai-schema";

const mergedSchemas = {
  ...studentSchemas,
  ...aiSchemas,
};

const VERSION = process.env.NEXT_PUBLIC_VERSION ?? "1.0";

const servers = [
  {
    url: "/api/{version}",
    description: "Active API (variable base)",
    variables: {
      version: {
        default: VERSION,
      },
    },
  },
  {
    url: `/api/${VERSION}`,
    description: `Active API (fixed ${VERSION})`,
  },
];

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "GCompro Swagger API",
        version: VERSION,
        description:
          "Base URL menggunakan OpenAPI servers. Default diarahkan ke versi dari ENV.",
      },
      servers,
      components: {
        schemas: mergedSchemas,
      },
    },
  });

  return spec;
};