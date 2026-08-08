import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, department } = body;

    if (!email || !password || !name) {
      return errorResponse("Email, password, and name are required");
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Email already registered");
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
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
