import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  let fullName: string | null = null;

  if (user) {
    const { data: profile } = await (await supabase)
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    fullName = profile?.full_name ?? null;
  }

  return (
    <div>
      <header className="border-b">
        <nav className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/">Home</Link>
            <Link href="/upload">Upload</Link>
            <Link href="/students">Mahasiswa</Link>
          </div>

          {/* kanan: user info + logout */}
          <div className="flex items-center gap-3">
            {fullName ? (
              <>
                <span className="text-sm text-gray-700">{fullName}</span>
                <LogoutButton />
              </>
            ) : (
              <Link href="/login" className="text-sm underline">
                Login
              </Link>
            )}
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-3 py-3">{children}</div>
    </div>
  );
}
