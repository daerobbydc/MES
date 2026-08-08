import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, ADMIN_ROLES } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { logChange } from "@/services/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(ADMIN_ROLES);
    const user = await db.user.findUnique({
      where: { id: params.id },
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
    });

    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(ADMIN_ROLES);
    const body = await request.json();
    const { name, role, department, isActive } = body;

    const existing = await db.user.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("User not found", 404);

    const user = await db.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(department !== undefined && { department }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logChange({
      userId: session.userId,
      action: "UPDATE",
      module: "users",
      recordId: params.id,
      oldValues: { name: existing.name, role: existing.role, department: existing.department, isActive: existing.isActive },
      newValues: { name: user.name, role: user.role, department: user.department, isActive: user.isActive },
    });

    return successResponse(user);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(ADMIN_ROLES);

    if (session.userId === params.id) {
      return errorResponse("Cannot delete your own account");
    }

    const existing = await db.user.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("User not found", 404);

    await db.user.delete({ where: { id: params.id } });

    await logChange({
      userId: session.userId,
      action: "DELETE",
      module: "users",
      recordId: params.id,
      oldValues: { email: existing.email, name: existing.name, role: existing.role },
    });

    return successResponse({ message: "User deleted" });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
