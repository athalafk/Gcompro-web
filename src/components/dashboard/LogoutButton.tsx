// src/components/dashboard/LogoutButton.tsx
export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="w-full text-left bg-blue-900 hover:bg-blue-800 rounded-lg px-4 py-3 transition-colors"
      >
        Keluar
      </button>
    </form>
  );
}