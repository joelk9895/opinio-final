import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { getAuthSession } from "@/lib/auth";

// Fetch or initialize site settings
export async function GET() {
  try {
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          config: {
            siteTitle: "",
            logoUrl: "",
            primaryColor: "#276ef1",
            primaryHoverColor: "#0e55d7",
            backgroundColor: "#ffffff",
            cardBackgroundColor: "#ffffff",
            foregroundColor: "#000000",
            darkPrimaryColor: "#276ef1",
            darkPrimaryHoverColor: "#4d90f4",
            darkBackgroundColor: "#121212",
            darkCardBackgroundColor: "#1e1e1e",
            darkForegroundColor: "#ffffff",
            headingFont: "Inter",
            bodyFont: "Inter",
          },
        },
      });
    }
    const cfg = settings.config as Record<string, string>;
    return NextResponse.json({
      siteTitle: cfg.siteTitle ?? "",
      logoUrl: cfg.logoUrl ?? "",
      primaryColor: cfg.primaryColor ?? "#276ef1",
      primaryHoverColor: cfg.primaryHoverColor ?? "#0e55d7",
      backgroundColor: cfg.backgroundColor ?? "#ffffff",
      cardBackgroundColor: cfg.cardBackgroundColor ?? "#ffffff",
      foregroundColor: cfg.foregroundColor ?? "#000000",
      darkPrimaryColor: cfg.darkPrimaryColor ?? "#276ef1",
      darkPrimaryHoverColor: cfg.darkPrimaryHoverColor ?? "#4d90f4",
      darkBackgroundColor: cfg.darkBackgroundColor ?? "#121212",
      darkCardBackgroundColor: cfg.darkCardBackgroundColor ?? "#1e1e1e",
      darkForegroundColor: cfg.darkForegroundColor ?? "#ffffff",
      headingFont: cfg.headingFont ?? "Inter",
      bodyFont: cfg.bodyFont ?? "Inter",
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// Update settings (admin only)
export async function PATCH(request: NextRequest) {
  // Verify JWT token and role
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || token.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const payload = await request.json();
    if (typeof payload !== "object" || payload === null) {
      return NextResponse.json(
        { error: "Invalid settings payload" },
        { status: 400 }
      );
    }
    // Merge with existing config
    let settings = await prisma.setting.findFirst();
    const existingConfig = (settings?.config as Record<string, any>) || {};
    const updatedConfig = { ...existingConfig, ...payload };
    if (!settings) {
      settings = await prisma.setting.create({
        data: { config: updatedConfig },
      });
    } else {
      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: { config: updatedConfig },
      });
    }
    return NextResponse.json(settings.config);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
