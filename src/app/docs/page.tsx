export const dynamic = "force-dynamic";

import { getApiDocs } from "@/lib/swagger";
import { createClient } from "@/utils/supabase/server";
import ReactSwaggerView from "@/views/docs/react-swagger";
import { redirect } from "next/navigation";

export default async function DocsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  if (!user) {
    redirect("/login");
  }

    let role: string | null = null;

  if (user) {
    const { data: profile } = await (await supabase)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    role = profile?.role ?? null;
  }

  if (role !== "admin") {
    redirect("/error?code=403");
  }

  const spec = await getApiDocs();
  return (
    <section className="container py-6">
      <ReactSwaggerView spec={spec} />
    </section>
  );
}
