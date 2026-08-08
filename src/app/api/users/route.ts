import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole, ADMIN_ROLES, hashPassword } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";
import { logChange } from "@/services/audit";

export async function GET(request: NextRequest) {
  try {
    await requireRole(ADMIN_ROLES);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (role) where.role = role;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return paginateResponse(data, total, page, limit);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(ADMIN_ROLES);
    const body = await request.json();
    const { email, password, name, role, department } = body;

    if (!email || !password || !name) {
      return errorResponse("Email, password, and name are required");
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Email already exists");
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "OPERATOR",
        department,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logChange({
      userId: session.userId,
      action: "CREATE",
      module: "users",
      recordId: user.id,
      newValues: { email, name, role: user.role },
    });

    return successResponse(user, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
