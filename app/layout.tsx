import AuthProvider from "@/components/AuthProvider";
import Header from "@/components/Header";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Insider — Learn anything from YouTube, in order",
  description:
    "Tell AI Insider what you want to learn. It maps a route through YouTube's best videos and tracks your progress along it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
