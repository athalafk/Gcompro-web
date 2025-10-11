'use client';

export default function RegisterSentView({ email }: { email?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3 border rounded-xl p-6">
        <h1 className="text-xl font-semibold">Verifikasi Email</h1>
        <p>
          Kami telah mengirim tautan verifikasi ke{" "}
          <strong>{email || "email Anda"}</strong>. 
          Silakan cek inbox / spam untuk menyelesaikan pendaftaran.
        </p>
      </div>
    </main>
  );
}