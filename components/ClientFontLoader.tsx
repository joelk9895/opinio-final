"use client";

import { useEffect, useState } from "react";
import FontLoader from "./FontLoader";

// List of available Google Fonts (should match the list in admin/settings/page.tsx)
const GOOGLE_FONTS = [
  // Sans-serif fonts
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Plus Jakarta Sans",
  "Instrument Sans",
  "DM Sans",
  "Source Sans Pro",
  "Nunito",
  "Work Sans",
  "Barlow",
  "Quicksand",
  "Rubik",
  "Ubuntu",
  "Outfit",
  "Figtree",
  "Public Sans",

  // Serif fonts
  "Merriweather",
  "Playfair Display",
  "Lora",
  "Bitter",
  "Instrument Serif",
  "Crimson Pro",
  "Cardo",
  "Cormorant",
  "EB Garamond",
  "Libre Baskerville",

  // Display/Decorative fonts
  "Lobster",
  "Pacifico",
  "Dancing Script",
  "Comfortaa",
  "Permanent Marker",
  "Josefin Sans",
  "Staatliches",
];

export default function ClientFontLoader() {
  const [fonts, setFonts] = useState({
    headingFont: "Inter",
    bodyFont: "Inter",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setFonts({
          headingFont: data.headingFont || "Inter",
          bodyFont: data.bodyFont || "Inter",
        });
      })
      .catch((err) => console.error("Error loading font settings:", err));
  }, []);

  return (
    <FontLoader
      headingFont={fonts.headingFont}
      bodyFont={fonts.bodyFont}
      fontList={GOOGLE_FONTS}
    />
  );
}
