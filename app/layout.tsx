import "./globals.css";
import type { Metadata } from "next";
import AuthProvider from "@/components/auth/AuthProvider";
import { prisma } from "@/lib/db";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientFontLoader from "@/components/ClientFontLoader";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.setting.findFirst();
  const cfg = (settings?.config as any) || {};
  const siteTitle = cfg.siteTitle || "Opinio - Feature Requests & Feedback";
  const description =
    cfg.description ||
    "Share ideas, vote on features, and help shape the future of products";

  return {
    title: siteTitle,
    description: description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await prisma.setting.findFirst();
  const cfg = (settings?.config as any) || {};

  // Define light theme variables from DB settings or fallbacks
  const lightTheme = {
    background: cfg.backgroundColor || "#ffffff",
    foreground: cfg.foregroundColor || "#000000",
    primary: cfg.primaryColor || "#276ef1",
    muted: cfg.muted || "#f5f5f5",
    mutedForeground: cfg.mutedForegroundColor || "#737373",
    cardBackground: cfg.cardBackgroundColor || "#ffffff",
  };

  // Define dark theme variables from DB settings or fallbacks
  const darkTheme = {
    background: cfg.darkBackgroundColor || "#121212",
    foreground: cfg.darkForegroundColor || "#ffffff",
    primary: cfg.darkPrimaryColor || "#276ef1",
    muted: cfg.darkMuted || "#1e1e1e",
    mutedForeground: cfg.darkMutedForegroundColor || "#a3a3a3",
    cardBackground: cfg.darkCardBackgroundColor || "#1e1e1e",
  };

  // Construct CSS string with variables from database settings
  const dynamicStyles = `
    :root {
      --background: ${lightTheme.background};
      --foreground: ${lightTheme.foreground};
      --primary: ${lightTheme.primary};
      --muted: ${lightTheme.muted};
      --muted-foreground: ${lightTheme.mutedForeground};
      --card-background: ${lightTheme.cardBackground};
    }
    html.dark {
      --background: ${darkTheme.background};
      --foreground: ${darkTheme.foreground};
      --primary: ${darkTheme.primary};
      --muted: ${darkTheme.muted};
      --muted-foreground: ${darkTheme.mutedForeground};
      --card-background: ${darkTheme.cardBackground};
    }
  `;

  return (
    <html lang="en" className="h-full">
      <head>
        <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      </head>
      <body className="antialiased min-h-full bg-background text-foreground">
        <ThemeProvider>
          <ClientFontLoader />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
