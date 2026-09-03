import { COOKIE_NAME } from "@/infrastructure/auth/getOrCreateUserId";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Clear NextAuth session cookies
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.callback-url");
  cookieStore.delete("__Secure-next-auth.callback-url");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Secure-next-auth.csrf-token");

  // Clear our custom user ID cookie to ensure the next user gets a fresh anonymous ID
  cookieStore.delete(COOKIE_NAME);

  return NextResponse.json({ success: true }, { status: 200 });
}