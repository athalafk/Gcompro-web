import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await (await supabase).auth.getUser();

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
            {user ? (
              <>
                <span className="text-sm text-gray-700">{user.email}</span>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
                  >
                    Logout
                  </button>
                </form>
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
