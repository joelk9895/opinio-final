"use client";

import { useEffect } from "react";

interface FontLoaderProps {
  headingFont: string;
  bodyFont: string;
  // Optional parameter to load all fonts in GOOGLE_FONTS array (for the admin settings page)
  loadAllFonts?: boolean;
  fontList?: string[];
}

export function FontLoader({
  headingFont,
  bodyFont,
  loadAllFonts = false,
  fontList = [],
}: FontLoaderProps) {
  // Load the selected fonts (or all fonts for preview in settings)
  useEffect(() => {
    // Format font names for Google Fonts URL (replace spaces with '+')
    const formatFontName = (font: string) => font.replace(/\s+/g, "+");

    // Create a link element to load Google Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";

    // Build the Google Fonts URL
    let fontsToLoad = loadAllFonts ? fontList : [headingFont, bodyFont];
    // Remove duplicates
    fontsToLoad = [...new Set(fontsToLoad)];
    // Format the URL
    link.href = `https://fonts.googleapis.com/css2?family=${fontsToLoad
      .map(formatFontName)
      .join("&family=")}&display=swap`;

    // Add the link to the document head
    document.head.appendChild(link);

    // Clean up function to remove the link when component unmounts or fonts change
    return () => {
      document.head.removeChild(link);
    };
  }, [headingFont, bodyFont, loadAllFonts, fontList]);

  // Apply font styles to document (only for active fonts, not previews)
  useEffect(() => {
    if (loadAllFonts) return; // Skip if we're just loading all fonts for preview

    const fontStyle = document.createElement("style");
    fontStyle.textContent = `
      :root {
        --font-heading: ${headingFont}, sans-serif;
        --font-body: ${bodyFont}, sans-serif;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
      }
      
      body {
        font-family: var(--font-body);
      }
    `;

    document.head.appendChild(fontStyle);

    return () => {
      document.head.removeChild(fontStyle);
    };
  }, [headingFont, bodyFont, loadAllFonts]);

  // This component doesn't render anything
  return null;
}

export default FontLoader;
