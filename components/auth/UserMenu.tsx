"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  if (status === "loading") {
    return (
      <div className="animate-pulse rounded-full h-10 w-10 bg-gray-200 dark:bg-gray-700"></div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {session ? (
        <>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center space-x-3 focus:outline-none p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
          >
            <div className="h-10 w-10 rounded-full bg-[color:var(--primary)] flex items-center justify-center text-white overflow-hidden">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-semibold text-lg">
                  {session.user?.name?.[0]?.toUpperCase() ||
                    session.user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </span>
              )}
            </div>
            <div className="text-sm hidden md:block text-left">
              <div className="font-medium text-gray-800 dark:text-gray-100">
                {session.user?.name ||
                  session.user?.email?.split("@")[0] ||
                  "User"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                View Profile
              </div>
            </div>
            <svg
              className={`hidden md:block h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-20 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {session.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.user?.email || ""}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-[color:var(--primary)] dark:hover:text-[color:var(--primary)] transition-colors duration-150"
              >
                Your Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-[color:var(--primary)] dark:hover:text-[color:var(--primary)] transition-colors duration-150"
              >
                Settings
              </Link>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-700/20 hover:text-red-700 dark:hover:text-red-500 transition-colors duration-150"
              >
                Sign out
              </button>
            </div>
          )}
        </>
      ) : (
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-md text-white bg-[color:var(--primary)] hover:bg-[color:var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors duration-150"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
