import { NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

/**
 * Build the CSP for a single request.
 *
 * Production uses a per-request nonce plus 'strict-dynamic', so inline scripts
 * only run if Next.js stamped them with this request's nonce. Development keeps
 * 'unsafe-inline'/'unsafe-eval' because the dev runtime and HMR inject scripts
 * that would otherwise be blocked.
 *
 * `style-src` needs 'unsafe-inline' in both environments: nonces do not apply
 * to `style` attributes, and this app uses inline styles throughout.
 */
function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://js.stripe.com"
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://www.youtube.com https://s.ytimg.com https://js.stripe.com`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com https://hooks.stripe.com",
    "connect-src 'self' https://www.googleapis.com https://api.stripe.com https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  // Next.js reads this to attach the nonce to the scripts it renders.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
