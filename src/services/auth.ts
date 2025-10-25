import type { MyProfile } from "@/models/types/auth/auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export async function getMyProfile(): Promise<MyProfile | null> {
  const res = await fetch(`${BASE_URL}/api/profile`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (res.status === 401) return null;
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as MyProfile;
  return json;
}