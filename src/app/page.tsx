"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfileContext } from "@/contexts/profile-context";
import LoadingSpinner from "@/components/loading/loading-spinner";

export default function Home() {
  const router = useRouter();
  const { profile, loading } = useProfileContext();

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (profile.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }
  }, [loading, profile, router]);

  return (
    <LoadingSpinner />
  );
}
