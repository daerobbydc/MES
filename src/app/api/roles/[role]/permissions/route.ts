import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { logChange } from "@/services/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    await requireAuth();

    const rolePerms = await db.rolePermission.findMany({
      where: { role: params.role as any },
      include: { permission: true },
    });

    const permissions = rolePerms.map((rp) => rp.permission);

    return successResponse({ role: params.role, permissions });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return errorResponse("permissionIds must be an array");
    }

    await db.rolePermission.deleteMany({ where: { role: params.role as any } });

    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((permissionId: string) => ({
          role: params.role as any,
          permissionId,
        })),
      });
    }

    await logChange({
      userId: session.userId,
      action: "UPDATE_PERMISSIONS",
      module: "roles",
      recordId: params.role,
      newValues: { permissionIds },
    });

    return successResponse({ message: "Permissions updated", role: params.role, permissionCount: permissionIds.length });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
