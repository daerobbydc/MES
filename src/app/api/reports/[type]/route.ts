import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { ReportsService } from "@/services/reports";

const VALID_TYPES = ["production", "sales", "purchase", "inventory", "financial", "quality", "kpis"];

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    await requireAuth();
    const { type } = params;
    const { searchParams } = new URL(request.url);

    if (!VALID_TYPES.includes(type)) {
      return errorResponse(`Invalid report type. Valid types: ${VALID_TYPES.join(", ")}`);
    }

    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const status = searchParams.get("status") || undefined;

    let data;

    switch (type) {
      case "production":
        data = await ReportsService.getProductionReport({ from, to, status });
        break;
      case "sales":
        data = await ReportsService.getSalesReport({ from, to });
        break;
      case "purchase":
        data = await ReportsService.getPurchaseReport({ from, to });
        break;
      case "inventory":
        data = await ReportsService.getInventoryReport();
        break;
      case "financial":
        data = await ReportsService.getFinancialReport({ from, to });
        break;
      case "quality":
        data = await ReportsService.getQualityReport({ from, to });
        break;
      case "kpis":
        data = await ReportsService.getDashboardKPIs();
        break;
    }

    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
