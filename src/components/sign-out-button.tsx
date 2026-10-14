"use client";

import { IconLogout } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({
  label,
  redirectTo,
}: {
  label: string;
  redirectTo: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 rounded-md px-1 py-1.5 sm:px-2"
      onClick={async () => {
        await authClient.signOut();
        router.push(redirectTo);
        router.refresh();
      }}
    >
      <IconLogout size={16} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
