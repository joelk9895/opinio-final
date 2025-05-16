"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import UserMenu from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider"; // Import useTheme

export default function Navigation() {
  const { data: session } = useSession();
  // Branding will be empty until settings load; no default fallback
  const [branding, setBranding] = useState<{
    siteTitle: string;
    logoUrl?: string;
  }>({ siteTitle: "", logoUrl: undefined });

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme(); // Use the theme context

  // Load branding settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setBranding({
          siteTitle: data.siteTitle || branding.siteTitle,
          logoUrl: data.logoUrl || undefined,
        });
      });
  }, []);

  // Navigation links with active state handling
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Submit", href: "/submit" },
    { name: "API", href: "/api" },
  ];

  // Include admin settings link if user is admin
  const finalLinks =
    session?.user.role === "ADMIN"
      ? [...navLinks, { name: "Settings", href: "/admin/settings" }]
      : navLinks;

  return (
    <header className="bg-[var(--background)] shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and primary navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.siteTitle}
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <svg
                    className="h-8 w-8 text-primary"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 2H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h3v3.766L13.277 18H20c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zm0 14h-7.277L9 18.234V16H4V4h16v12z" />
                    <circle cx="15" cy="10" r="2" />
                    <circle cx="9" cy="10" r="2" />
                  </svg>
                )}
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                  {branding.siteTitle}
                </span>
              </Link>
            </div>

            {/* Desktop navigation links */}
            <nav className="hidden md:ml-8 md:flex md:space-x-2">
              {finalLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-gray-700 dark:text-gray-200 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side - Search and profile/auth */}
          <div className="flex items-center space-x-3">
            {/* Search box */}

            {/* Dark Mode Toggle Button */}
            <Button
              variant="ghost"
              size="sm" // Changed from size="sm" to size="icon"
              onClick={toggleTheme} // Use toggleTheme from context
              aria-label="Toggle theme"
              className="text-[var(--primary)] hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-2"
            >
              {theme === "light" ? (
                <svg
                  className="h-6 w-6 " // Adjusted to h-6 w-6, can be tweaked further
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="5"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path d="M12 1V3" stroke="currentColor" stroke-width="2" />
                  <path d="M12 21V23" stroke="currentColor" stroke-width="2" />
                  <path
                    d="M4.22 4.22L5.64 5.64"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M18.36 18.36L19.78 19.78"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path d="M1 12H3" stroke="currentColor" stroke-width="2" />
                  <path d="M21 12H23" stroke="currentColor" stroke-width="2" />
                  <path
                    d="M4.22 19.78L5.64 18.36"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M18.36 5.64L19.78 4.22"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6" // Adjusted to h-6 w-6, can be tweaked further
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </Button>

            {/* Authentication */}
            {session ? (
              <UserMenu />
            ) : (
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2 border-none"
                >
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button size="sm">
                  <Link href="/auth/signin?signup=true">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu (hidden by default) */}
      <div className="md:hidden border-t border-gray-200 dark:border-gray-800">
        <div className="pt-2 pb-3 px-4 space-y-1">
          {finalLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {/* Mobile search */}
          <div className="pt-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                placeholder="Search discussions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
