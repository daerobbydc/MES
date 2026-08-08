import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

const AI_SETTING_KEYS = [
  "ai_provider",
  "ai_api_key",
  "ai_model",
  "ai_temperature",
  "ai_auto_insights",
  "ai_system_prompt",
];

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const settings = await db.systemSetting.findMany({
      where: { key: { in: AI_SETTING_KEYS } },
    });

    const settingMap: Record<string, string> = {
      ai_provider: "INTERNAL", // Default: INTERNAL | GEMINI | OPENAI | OLLAMA
      ai_api_key: "",
      ai_model: "gemini-1.5-flash",
      ai_temperature: "0.4",
      ai_auto_insights: "true",
      ai_system_prompt: "You are an expert AI Production Copilot for an industrial MES system. Analyze factory telemetry and provide actionable operational recommendations.",
    };

    settings.forEach((s) => {
      settingMap[s.key] = s.value;
    });

    // Mask API key for security in response
    const maskedApiKey = settingMap.ai_api_key
      ? `${settingMap.ai_api_key.slice(0, 4)}...${settingMap.ai_api_key.slice(-4)}`
      : "";

    return successResponse({
      provider: settingMap.ai_provider,
      hasApiKey: Boolean(settingMap.ai_api_key),
      maskedApiKey,
      model: settingMap.ai_model,
      temperature: parseFloat(settingMap.ai_temperature) || 0.4,
      autoInsights: settingMap.ai_auto_insights === "true",
      systemPrompt: settingMap.ai_system_prompt,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch AI settings", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const { provider, apiKey, model, temperature, autoInsights, systemPrompt } = body;

    const updates: { key: string; value: string; module: string; description: string }[] = [
      { key: "ai_provider", value: provider || "INTERNAL", module: "AI_COPILOT", description: "AI Model Provider" },
      { key: "ai_model", value: model || "gemini-1.5-flash", module: "AI_COPILOT", description: "AI Model Name" },
      { key: "ai_temperature", value: String(temperature ?? 0.4), module: "AI_COPILOT", description: "AI Temperature" },
      { key: "ai_auto_insights", value: String(Boolean(autoInsights)), module: "AI_COPILOT", description: "Auto Insights Enabled" },
      { key: "ai_system_prompt", value: systemPrompt || "", module: "AI_COPILOT", description: "AI System Persona Prompt" },
    ];

    // Only update API key if provided (don't overwrite with masked key)
    if (apiKey !== undefined && !apiKey.includes("...")) {
      updates.push({
        key: "ai_api_key",
        value: apiKey,
        module: "AI_COPILOT",
        description: "AI Provider API Key",
      });
    }

    for (const u of updates) {
      await db.systemSetting.upsert({
        where: { key: u.key },
        update: { value: u.value, module: u.module, description: u.description },
        create: { key: u.key, value: u.value, module: u.module, description: u.description },
      });
    }

    return successResponse({ message: "AI Copilot settings updated successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to save AI settings", 500);
  }
}
