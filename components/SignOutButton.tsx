"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

export default function SignOutButton() {
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
      className="inline-flex items-center gap-3 px-4 py-2 rounded-lg border border-white/15 text-[var(--text)] hover:border-white/30 hover:bg-white/5 transition text-sm"
    >
      {userImage ? (
        <Image
          src={userImage}
          alt={userName}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
          {userName.charAt(0).toUpperCase()}
        </div>
      )}
      Sign out
    </button>
  );
}