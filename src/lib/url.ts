const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const VERSION = process.env.NEXT_PUBLIC_VERSION ?? "";

export function joinApi(path: string): string {
  const cleanBase = BASE_URL.replace(/\/+$/, "");
  const prefix = VERSION ? `/api/${VERSION}` : "/api";

  const cleanPath = `/${path}`.replace(/\/+/, "/");

  return `${cleanBase}${prefix}${cleanPath}`;
}
