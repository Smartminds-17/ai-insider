import AuthProvider from "@/components/AuthProvider";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toast";
import { authOptions } from "@/infrastructure/auth/auth";
import { cn } from "@/lib/utils";
import { prisma } from "@/src/infrastructure/db/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "AI Insider — Learn anything from YouTube, in order",
  description:
    "Tell AI Insider what you want to learn. It maps a route through YouTube's best videos and tracks your progress along it.",
};

// Map Stripe price IDs to tier information (matches pricing page chip classes)
function getUserTier(stripePriceId: string | null | undefined) {
  // Free tier (Day hike) by default
  if (!stripePriceId) {
    return { name: "Day hike", chipClass: "chip--ink", isFree: true };
  }
  
  // Thru-hike tier ($9/mo)
  if (stripePriceId === process.env.STRIPE_THRU_HIKE_PRICE_ID) {
    return { name: "Thru-hike", chipClass: "chip--route", isFree: false };
  }
  
  // Guided expedition tier ($39/mo)
  if (stripePriceId === process.env.STRIPE_GUIDED_EXPEDITION_PRICE_ID) {
    return { name: "Guided expedition", chipClass: "chip--sage", isFree: false };
  }
  
  // Fallback to free tier for unknown price IDs
  return { name: "Day hike", chipClass: "chip--ink", isFree: true };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch current user's stripe data to determine their tier
  const session = await getServerSession(authOptions);
  let userTier = { name: "Day hike", chipClass: "chip--ink", isFree: true };
  
  if (session?.user?.email) {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { stripe_price_id: true }
    });
    userTier = getUserTier(currentUser?.stripe_price_id);
  }

  return (
    <html lang="en" className={cn("h-full antialiased", geistSans.variable, geistMono.variable)}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Toaster>
            <Header userTier={userTier} />
            {children}
          </Toaster>
        </AuthProvider>
      </body>
    </html>
  );
}