"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FontLoader } from "@/components/FontLoader";

// Expanded Google Fonts selection
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

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  interface SettingsConfig {
    siteTitle: string;
    logoUrl: string;
    primaryColor: string;
    primaryHoverColor: string;
    backgroundColor: string;
    cardBackgroundColor: string;
    foregroundColor: string;
    darkPrimaryColor: string;
    darkPrimaryHoverColor: string;
    darkBackgroundColor: string;
    darkCardBackgroundColor: string;
    darkForegroundColor: string;
    headingFont: string;
    bodyFont: string;
  }

  // Category state
  interface Category {
    id: string;
    name: string;
    slug: string;
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [config, setConfig] = useState<SettingsConfig>({
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user.role !== "ADMIN") {
        setError("Unauthorized");
        setLoading(false);
        return;
      }

      // Load settings
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) =>
          setConfig({
            siteTitle: data.siteTitle || "",
            logoUrl: data.logoUrl || "",
            primaryColor: data.primaryColor || "#276ef1",
            primaryHoverColor: data.primaryHoverColor || "#0e55d7",
            backgroundColor: data.backgroundColor || "#ffffff",
            cardBackgroundColor: data.cardBackgroundColor || "#ffffff",
            foregroundColor: data.foregroundColor || "#000000",
            darkPrimaryColor: data.darkPrimaryColor || "#276ef1",
            darkPrimaryHoverColor: data.darkPrimaryHoverColor || "#4d90f4",
            darkBackgroundColor: data.darkBackgroundColor || "#121212",
            darkCardBackgroundColor: data.darkCardBackgroundColor || "#1e1e1e",
            darkForegroundColor: data.darkForegroundColor || "#ffffff",
            headingFont: data.headingFont || "Inter",
            bodyFont: data.bodyFont || "Inter",
          })
        )
        .catch(() => setError("Failed to load settings"))
        .finally(() => setLoading(false));

      // Load categories
      fetch("/api/categories")
        .then((res) => res.json())
        .then((data) => setCategories(data))
        .catch(() => setCategoryError("Failed to load categories"));
    }
  }, [session, status]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage("Settings saved successfully.");
      setError(null);
    } catch {
      setError("Save failed. Please check your inputs.");
      setMessage(null);
    }
  };

  // Category management functions
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError("Category name cannot be empty");
      return;
    }

    setCategoryLoading(true);
    setCategoryError(null);
    setCategorySuccess(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create category");
      }

      const newCategory = await res.json();
      setCategories([...categories, newCategory]);
      setNewCategoryName("");
      setCategorySuccess("Category created successfully");
    } catch (err: any) {
      setCategoryError(err.message || "Failed to create category");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    console.log("handleDeleteCategory called with ID:", id); // <-- ADD THIS LINE
    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    setCategoryLoading(true);
    setCategoryError(null);
    setCategorySuccess(null);

    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete category");
      }

      setCategories(categories.filter((cat) => cat.id !== id));
      setCategorySuccess("Category deleted successfully");
    } catch (err: any) {
      setCategoryError(err.message || "Failed to delete category");
    } finally {
      setCategoryLoading(false);
    }
  };

  if (loading) return <p>Loading settings...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Load all fonts for the preview dropdowns */}
      <FontLoader
        headingFont={config.headingFont}
        bodyFont={config.bodyFont}
        loadAllFonts={true}
        fontList={GOOGLE_FONTS}
      />

      <h1 className="text-2xl font-bold mb-4">Admin Settings</h1>

      {/* Category Management Section */}
      <fieldset className="border-t pt-4 space-y-4">
        <legend className="text-lg font-semibold">Category Management</legend>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={categoryLoading}
          />
          <Button
            onClick={handleAddCategory}
            disabled={categoryLoading || !newCategoryName.trim()}
          >
            Add Category
          </Button>
        </div>

        {categoryError && (
          <p className="text-red-500 text-sm">{categoryError}</p>
        )}
        {categorySuccess && (
          <p className="text-green-500 text-sm">{categorySuccess}</p>
        )}

        <div className="mt-4">
          <h3 className="text-md font-medium mb-2">Current Categories</h3>
          {categories.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => {
                    console.log("Rendering category:", category); // <-- ADD THIS LINE
                    return (
                      <tr key={category.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {category.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {category.slug}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={categoryLoading}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No categories yet.
            </p>
          )}
        </div>
      </fieldset>

      <div className="space-y-4">
        {/* Branding */}
        <div>
          <label className="block text-sm font-medium mb-1">Site Title</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={config.siteTitle}
            onChange={(e) =>
              setConfig({ ...config, siteTitle: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo URL</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={config.logoUrl}
            onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
          />
        </div>

        {/* Typography Settings */}
        <fieldset className="border-t pt-4 space-y-4">
          <legend className="text-lg font-semibold">Typography</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Heading Font</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                value={config.headingFont}
                onChange={(e) =>
                  setConfig({ ...config, headingFont: e.target.value })
                }
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
              <div
                className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-xl font-semibold"
                style={{ fontFamily: config.headingFont }}
              >
                <p>Preview: {config.headingFont}</p>
                <p className="mt-2">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Body Font</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                value={config.bodyFont}
                onChange={(e) =>
                  setConfig({ ...config, bodyFont: e.target.value })
                }
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
              <div
                className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                style={{ fontFamily: config.bodyFont }}
              >
                <p>Preview: {config.bodyFont}</p>
                <p className="mt-2">
                  The quick brown fox jumps over the lazy dog. This is how your
                  body text will appear throughout the site, including
                  paragraphs and most UI elements.
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Theme Editor (Light) */}
        <fieldset className="border-t pt-4 space-y-4">
          <legend className="text-lg font-semibold">Theme Colors</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Primary Color</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.primaryColor}
                onChange={(e) =>
                  setConfig({ ...config, primaryColor: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Primary Hover</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.primaryHoverColor}
                onChange={(e) =>
                  setConfig({ ...config, primaryHoverColor: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Background</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.backgroundColor}
                onChange={(e) =>
                  setConfig({ ...config, backgroundColor: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Card Background</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.cardBackgroundColor}
                onChange={(e) =>
                  setConfig({ ...config, cardBackgroundColor: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Foreground</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.foregroundColor}
                onChange={(e) =>
                  setConfig({ ...config, foregroundColor: e.target.value })
                }
              />
            </div>
          </div>
        </fieldset>
        {/* Dark Theme Colors */}
        <fieldset className="border-t pt-4 space-y-4">
          <legend className="text-lg font-semibold">Dark Theme Colors</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Primary</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.darkPrimaryColor}
                onChange={(e) =>
                  setConfig({ ...config, darkPrimaryColor: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Primary Hover</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.darkPrimaryHoverColor}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    darkPrimaryHoverColor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Background</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.darkBackgroundColor}
                onChange={(e) =>
                  setConfig({ ...config, darkBackgroundColor: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Card Background</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.darkCardBackgroundColor}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    darkCardBackgroundColor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Foreground</label>
              <input
                type="color"
                className="w-full h-10 p-0 border-0"
                value={config.darkForegroundColor}
                onChange={(e) =>
                  setConfig({ ...config, darkForegroundColor: e.target.value })
                }
              />
            </div>
          </div>
        </fieldset>
      </div>
      <div className="mt-4 flex items-center space-x-2">
        <Button onClick={handleSave}>Save</Button>
        {message && <span className="text-green-600">{message}</span>}
      </div>
    </div>
  );
}
