import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b">
        <nav className="container mx-auto px-6 py-3 flex gap-4">
          <Link href="/">Home</Link>
          <Link href="/upload">Upload</Link>
          <Link href="/students">Mahasiswa</Link>
        </nav>
      </header>
      <div className="container mx-auto px-6 py-6">{children}</div>
    </div>
  );
}
