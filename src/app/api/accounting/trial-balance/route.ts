import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { CostingService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const trialBalance = await CostingService.getTrialBalance();
    const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);
    return successResponse({ accounts: trialBalance, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
