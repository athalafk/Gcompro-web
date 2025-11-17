"use client";

import type { PropsWithChildren } from "react";
import { ProfileProvider } from "@/contexts/profile-context";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ProfileProvider>
      {children}
    </ProfileProvider>
  );
}
