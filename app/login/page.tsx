"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-5 py-12 text-[var(--text)]">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSignIn = async () => {
    // For OAuth providers like Google, NextAuth automatically handles redirect
    // Migration happens server-side in NextAuth's events.signIn callback
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-5 py-12 text-[var(--text)]">
      <div className="surface-card w-full max-w-md p-7 sm:p-9">
        <span className="legend-label legend-label--route mb-3 block text-center">Welcome back</span>
        <h1 className="font-display mb-2 text-center text-3xl font-medium">AI Insider</h1>
        <p className="text-center text-white/60 mb-8 text-sm">
          Sign in to save your learning paths and progress
        </p>

        <button
          onClick={handleSignIn}
          className="btn w-full justify-center rounded-xl bg-white px-4 py-3 font-medium text-gray-900 transition hover:bg-gray-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        <p className="text-center text-white/40 text-xs mt-6">
          Your anonymous learning data will be transferred to your account
        </p>
      </div>
    </main>
  );
}
