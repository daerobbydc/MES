import { NextRequest, NextResponse } from "next/server";
import { requireRole, ADMIN_ROLES } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // ADMIN only — enforced at middleware AND here (defense in depth)
    await requireRole(ADMIN_ROLES);

    const { stdout, stderr } = await execAsync("npx prisma db seed", {
      cwd: process.cwd(),
      timeout: 120_000, // 2 minute timeout
    });

    return successResponse({
      message: "Database successfully seeded with demo dataset!",
      output: stdout || stderr,
    });
  } catch (error: any) {
    if (error.message === "Forbidden: Insufficient permissions") {
      return errorResponse(error.message, 403);
    }
    if (error.message === "Unauthorized") {
      return errorResponse(error.message, 401);
    }
    console.error("[Seed Error]", error.message);
    return errorResponse("Failed to execute database seed", 500);
  }
}
