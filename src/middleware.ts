import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ─── Configuration ────────────────────────────────────────────────────────────
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret-replace-in-production"
);

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/login",
  "/api/health",
];

// Routes that require ADMIN role only
const ADMIN_ONLY_ROUTES = [
  "/api/admin/",
  "/api/users",
  "/api/roles",
  "/api/permissions",
];

// ─── Security Headers ─────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https:",
    "frame-ancestors 'none'",
  ].join("; "),
};

// ─── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Apply security headers to ALL responses
  const response = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // 2. Allow public routes through without auth checks
  if (PUBLIC_ROUTES.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // 3. For API routes: validate JWT token fully
  if (pathname.startsWith("/api/")) {
    const token = request.cookies.get("mes_session")?.value;

    const isDevBypass =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_DEV_BYPASS === "true";

    if (!token && !isDevBypass) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Session token missing or expired" },
        { status: 401 }
      );
    }

    let payload: any = { userId: "dev", role: "OPERATOR", email: "dev@mes.com", name: "Dev User" };
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        payload = verified.payload;
      } catch (err) {
        // Token is expired or invalid
        const errResponse = NextResponse.json(
          { success: false, error: "Unauthorized: Session expired. Please log in again." },
          { status: 401 }
        );
        errResponse.cookies.set("mes_session", "", { maxAge: 0, path: "/" });
        return errResponse;
      }
    }

    // 4. Enforce ADMIN-only on admin routes
    if (ADMIN_ONLY_ROUTES.some((p) => pathname.startsWith(p))) {
      if (payload.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Forbidden: Admin access required" },
          { status: 403 }
        );
      }
    }

    response.headers.set("X-User-Id", payload.userId || "");
    response.headers.set("X-User-Role", payload.role || "");
    response.headers.set("X-User-Email", payload.email || "");

    return response;
  }

  // 5. For dashboard pages: redirect unauthenticated or expired users to login
  const token = request.cookies.get("mes_session")?.value;
  const isDevBypassPage =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_BYPASS === "true";

  if (!token) {
    if (!isDevBypassPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // Verify token validity
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      const p = verified.payload as any;
      response.headers.set("X-User-Id", p.userId || "");
      response.headers.set("X-User-Role", p.role || "");
    } catch (err) {
      // JWT is expired or corrupted -> Redirect to login with reason=expired and clear cookie!
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "expired");
      loginUrl.searchParams.set("callbackUrl", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.set("mes_session", "", { maxAge: 0, path: "/" });
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|login).*)",
  ],
};
