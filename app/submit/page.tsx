"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navigation from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";

// Define Category type
type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function SubmitRequest() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories on component mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          categoryIds: categoryId ? [categoryId] : undefined, // Only include if selected
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feature request");
      }

      // Redirect to home page after successful submission
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Error submitting feature request:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit your feature request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect to sign-in if not authenticated
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        <Navigation />
        <main className="flex-grow flex justify-center items-center max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        <Navigation />
        <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center">
          <div className="bg-[var(--card)] rounded-xl shadow-md p-6 sm:p-8 mb-10 border border-[var(--border)] w-full">
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6 text-center">
              Sign In Required
            </h1>
            <p className="text-center mb-6 text-[var(--muted-foreground)]">
              You need to be signed in to submit a feature request.
            </p>
            <div className="flex justify-center">
              <Button className="mx-2">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button variant="outline" className="mx-2">
                <Link href="/auth/signin?signup=true">Sign Up</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Navigation />

      {/* Main Content */}
      <main className="flex-grow flex justify-center items-center max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[var(--card-background)] rounded-xl shadow-md p-6 sm:p-8 w-full">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-8 text-center sm:text-left">
            Submit a Feature Request
          </h1>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 mb-6 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400 dark:text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-[var(--foreground)] mb-1"
              >
                Title
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="title"
                  id="title"
                  placeholder="e.g., Add dark mode for the dashboard"
                  className="block w-full px-4 py-3 border border-[var(--border)] rounded-lg shadow-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm bg-[var(--input)] text-[var(--foreground)]"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                A clear and descriptive title helps everyone understand your
                request quickly.
              </p>
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-[var(--foreground)] mb-1"
              >
                Category
              </label>
              <div className="mt-1">
                <select
                  id="category"
                  name="category"
                  className="block w-full px-4 py-3 border border-[var(--border)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm bg-[var(--input)] text-[var(--foreground)]"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={loadingCategories}
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Choosing a category helps organize and prioritize your request.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-[var(--foreground)] mb-1"
              >
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  placeholder="Describe the feature in detail. What problem does it solve? How would it benefit users?"
                  className="block w-full px-4 py-3 border border-[var(--border)] rounded-lg shadow-sm placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary sm:text-sm bg-[var(--input)] text-[var(--foreground)]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                The more details you provide, the better. Consider including use
                cases or examples.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push("/")}
                className="px-6 py-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={`px-6 py-3 ${
                  submitting ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit Feature Request"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
