"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

interface SignOutButtonProps {
  compact?: boolean; // For dropdown menu use
}

export default function SignOutButton({ compact = false }: SignOutButtonProps) {
  const { data: session } = useSession();
  const userImage = session?.user?.image;
  const userName = session?.user?.name || "User";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleLogout}
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border border-white/15 text-[var(--text)] hover:border-white/30 hover:bg-white/5 transition text-sm w-full ${compact ? 'justify-start' : ''}`}
    >
      {!compact && userImage ? (
        <Image
          src={userImage}
          alt={userName}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : !compact ? (
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
          {userName.charAt(0).toUpperCase()}
        </div>
      ) : (
        // Logout icon for compact dropdown mode
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      )}
      Sign out
    </button>
  );
}