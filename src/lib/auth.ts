import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// ─── JWT Secret ───────────────────────────────────────────────────────────────
// CRITICAL: In production, JWT_SECRET must be a random 256-bit string set in env vars.
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("[SECURITY] JWT_SECRET environment variable is required in production!");
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret-replace-in-production"
);

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h"; // Shorter lived tokens

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

// ─── Password Hashing ─────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Token Signing / Verification ─────────────────────────────────────────────
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Session Helpers ──────────────────────────────────────────────────────────
export async function getSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("mes_session")?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) return payload;
    }
  } catch (e: any) {
    if (
      e?.digest === "DYNAMIC_SERVER_USAGE" ||
      e?.name === "DynamicServerError" ||
      e?.message?.includes("DYNAMIC_SERVER_USAGE")
    ) {
      throw e;
    }
    console.error("Auth session error:", e);
  }

  // Controlled Dev Bypass when no token exists
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_BYPASS === "true"
  ) {
    return {
      userId: "admin-dev-id",
      email: "admin@mes.com",
      role: "ADMIN",
      name: "Administrator",
    };
  }

  return null;
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();
  if (session) return session;
  throw new Error("Unauthorized");
}

export async function requireRole(roles: string[]): Promise<JWTPayload> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
  return session;
}

// ─── RBAC Role Definitions ────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  QUALITY_INSPECTOR: "QUALITY_INSPECTOR",
  PLANNER: "PLANNER",
  OPERATOR: "OPERATOR",
} as const;

export const ADMIN_ROLES = [ROLES.ADMIN];
export const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.SUPERVISOR];
export const QUALITY_ROLES = [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.QUALITY_INSPECTOR];
export const PLANNER_ROLES = [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.PLANNER];
