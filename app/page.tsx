"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useSearchParams, useRouter } from "next/navigation";

// Status variants for forum-style badges
const STATUS_VARIANTS = {
  Open: "open",
  Planned: "planned",
  "In Progress": "in-progress",
  Completed: "completed",
} as const;

interface Post {
  id: string;
  title: string;
  description: string;
  status: keyof typeof STATUS_VARIANTS;
  votes: number;
  comments: number;
  views: number;
  createdAt: string;
  authorName: string;
}

interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PostsResponse {
  posts: Post[];
  pagination: PaginationMeta;
}

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "votes");
  const [activeFilter, setActiveFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<
    Record<string, boolean>
  >({});

  // Fade in animation for posts
  const [visible, setVisible] = useState(false);

  // Active category filter
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") || "all"
  );

  // Dynamic categories from backend
  const [categories, setCategories] = useState<
    {
      id: string;
      name: string;
      slug: string;
      _count: { posts: number };
    }[]
  >([]);

  const CATEGORY_ICONS: Record<string, string> = {
    "feature-requests": "💡",
    "bug-reports": "🐛",
    enhancements: "⚡",
    "general-discussion": "💬",
  };

  // Default categories list similar to Upvoty
  const defaultCategories = [
    {
      id: "feature-requests",
      name: "Feature Requests",
      slug: "feature-requests",
    },
    { id: "bug-reports", name: "Bug Reports", slug: "bug-reports" },
    { id: "enhancements", name: "Enhancements", slug: "enhancements" },
    {
      id: "general-discussion",
      name: "General Discussion",
      slug: "general-discussion",
    },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        // Use fallback defaultCategories if API returns empty
        if (data.length > 0) {
          setCategories(data);
        } else {
          setCategories(
            defaultCategories.map((c) => ({ ...c, _count: { posts: 0 } }))
          );
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        // Fallback to default categories on error
        setCategories(
          defaultCategories.map((c) => ({ ...c, _count: { posts: 0 } }))
        );
      }
    };
    fetchCategories();
  }, []);

  // Limit of posts per page
  const POSTS_PER_PAGE = 10;

  // Update URL with filters
  const updateQueryParams = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    router.replace(url.pathname + url.search);
  };

  // Fetch paginated posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);

        // Construct the query parameters
        const params = new URLSearchParams();
        if (activeFilter !== "all") params.set("status", activeFilter);
        if (sortBy) params.set("sort", sortBy);
        params.set("page", currentPage.toString());
        params.set("limit", POSTS_PER_PAGE.toString());
        if (activeCategory !== "all") params.set("category", activeCategory);

        const response = await fetch(`/api/posts?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data: PostsResponse = await response.json();
        setPosts(data.posts);
        setPagination(data.pagination);

        // Update URL with the current filters
        updateQueryParams({
          page: currentPage > 1 ? currentPage.toString() : "",
          status: activeFilter !== "all" ? activeFilter : "",
          sort: sortBy !== "votes" ? sortBy : "",
          category: activeCategory !== "all" ? activeCategory : "",
        });

        // Fade in effect
        setTimeout(() => setVisible(true), 100);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, activeFilter, sortBy, activeCategory]);

  // Handle voting
  const handleVote = async (postId: string) => {
    // Avoid concurrent voting on same post
    if (votingInProgress[postId]) return;

    // Redirect to sign in if not authenticated
    if (!session) {
      window.location.href =
        "/auth/signin?callbackUrl=" + encodeURIComponent(window.location.href);
      return;
    }

    try {
      setVotingInProgress((prev) => ({ ...prev, [postId]: true }));

      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: postId,
          type: "UPVOTE",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process vote");
      }

      const data = await response.json();

      // Update the posts state with the new vote count
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, votes: data.voteCount } : post
        )
      );
    } catch (err) {
      console.error("Error processing vote:", err);
    } finally {
      setVotingInProgress((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
  };

  // Get username initial for avatar
  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      {/* Hero Header */}
      <div className="relative z-0 overflow-hidden w-full max-w-7xl mx-auto bg-gradient-to-r from-[var(--primary)] to-transparent text-white rounded-xl my-8">
        {/* Noise Overlay */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <svg
            className="w-full h-full opacity-50"
            xmlns="http://www.w3.org/2000/svg"
          >
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="4"
                stitchTiles="stitch"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 z-50">
                Community Forum
              </h1>
              <p className="text-lg text-[var(--foreground)]/60 mb-6">
                Join the conversation, share your ideas, and help shape our
                product roadmap
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-[var(--background)] text-[var(--foreground)] hover:bg-white/90 flex "
                >
                  <Link href="/submit" className="flex items-center">
                    <svg
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Start a Discussion
                  </Link>
                </Button>
                {!session && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent border-none text-[var(--foreground)]"
                  >
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <svg
                width="200"
                height="160"
                viewBox="0 0 200 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-80"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M110 10C110 4.47715 114.477 0 120 0H190C195.523 0 200 4.47715 200 10V80C200 85.5228 195.523 90 190 90H120C114.477 90 110 85.5228 110 80V10ZM10 40C4.47715 40 0 44.4772 0 50V150C0 155.523 4.47715 160 10 160H130C135.523 160 140 155.523 140 150V110H120C103.431 110 90 96.5685 90 80V40H10Z"
                  fill="white"
                  fillOpacity="0.2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          {/* Categories Card */}
          <div className="rounded-xl shadow-sm overflow-hidden mb-6 bg-[var(--card-background)]">
            <div className="px-5 py-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <svg
                  className="h-5 w-5 mr-2 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Categories
              </h2>
            </div>
            <nav>
              <button
                onClick={() => handleCategoryChange("all")}
                className={`w-full px-5 py-3 flex items-center ${
                  activeCategory === "all"
                    ? "bg-[var(--card-background)] text-primary border-l-4 border-primary pl-4"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <svg
                  className="h-5 w-5 mr-3 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                <span>All Topics</span>
                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                  {pagination?.totalCount || 0}
                </span>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`w-full px-5 py-3 flex items-center ${
                    activeCategory === category.slug
                      ? "bg-[var(--card-background)] text-primary border-l-4 border-primary pl-4"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="text-lg mr-3 flex-shrink-0">
                    {CATEGORY_ICONS[category.slug] || ""}
                  </span>
                  <span>{category.name}</span>
                  <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    {category._count.posts}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Status Filters */}
          <div className="rounded-xl shadow-sm overflow-hidden mb-6 bg-[var(--card-background)]">
            <div className="px-5 py-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <svg
                  className="h-5 w-5 mr-2 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filter by Status
              </h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterChange("all")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    activeFilter === "all"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  All
                </button>
                {Object.keys(STATUS_VARIANTS).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleFilterChange(status)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      activeFilter === status
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="rounded-xl shadow-sm overflow-hidden mb-6 bg-[var(--card-background)]">
            <div className="px-5 py-4 ">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <svg
                  className="h-5 w-5 mr-2 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                  />
                </svg>
                Sort Topics
              </h2>
            </div>
            <div className="p-4">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 dark:focus:ring-primary/40"
              >
                <option value="votes">Most Votes</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Column */}
        <div className="md:col-span-3">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {activeCategory === "all"
                  ? "All Discussions"
                  : categories.find((c) => c.slug === activeCategory)?.name ||
                    "Discussions"}
              </h1>
              <div className="text-sm breadcrumbs text-gray-500 dark:text-gray-400">
                <ul className="flex">
                  <li>
                    <Link href="/" className="hover:text-primary">
                      Home
                    </Link>
                  </li>
                  <li className="before:content-['/'] before:mx-2">Forums</li>
                  <li className="before:content-['/'] before:mx-2 text-gray-700 dark:text-gray-300">
                    {activeCategory === "all"
                      ? "All Topics"
                      : categories.find((c) => c.slug === activeCategory)
                          ?.name || "Topics"}
                  </li>
                </ul>
              </div>
            </div>

            <Button className="mt-4 sm:mt-0">
              <Link
                href="/submit"
                className="flex items-center text-background"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-background">New Discussion</span>
              </Link>
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4 flex items-start mb-6">
              <svg
                className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="ml-3 text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Topics List */}
          <div
            className={`transition-opacity duration-300 ease-in ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            {posts.length === 0 ? (
              <div className="bg-[var(--card-background)] rounded-xl shadow-sm p-12 text-center">
                <div className="flex justify-center mb-5">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-4">
                    <svg
                      className="h-10 w-10 text-gray-500 dark:text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Discussions Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-8">
                  {activeFilter === "all"
                    ? "Be the first to start a discussion in this forum."
                    : `There are no topics with status "${activeFilter}" yet.`}
                </p>
                <Button size="lg">
                  <Link href="/submit">Start a Discussion</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-[var(--background)] dark:divide-[var(--background)] rounded-xl shadow-sm overflow-hidden mb-6 bg-[var(--card-background)]">
                  {posts.map((post) => (
                    <div key={post.id} className="group">
                      <div className="px-6 py-5">
                        <div className="sm:flex sm:items-start">
                          {/* Avatar & Status */}
                          <div className="mb-4 sm:mb-0 sm:mr-5 flex-shrink-0">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] rounded-full flex items-center justify-center text-[var(--foreground)] text-xl font-semibold">
                                {getUserInitial(post.authorName)}
                              </div>
                              <div
                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center 
                                ${
                                  post.status === "Open"
                                    ? "bg-blue-100 text-blue-600"
                                    : post.status === "Planned"
                                    ? "bg-purple-100 text-purple-600"
                                    : post.status === "In Progress"
                                    ? "bg-yellow-100 text-yellow-600"
                                    : "bg-green-100 text-green-600"
                                }`}
                              >
                                {post.status === "Open" && (
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                )}
                                {post.status === "Planned" && (
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                  </svg>
                                )}
                                {post.status === "In Progress" && (
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                )}
                                {post.status === "Completed" && (
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 sm:pr-8">
                            <Link href={`/post/${post.id}`}>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary truncate transition">
                                {post.title}
                              </h3>
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                              <Badge
                                variant={STATUS_VARIANTS[post.status] as any}
                              >
                                {post.status}
                              </Badge>
                              <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                <svg
                                  className="h-3.5 w-3.5 mr-1.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                {post.authorName}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                <svg
                                  className="h-3.5 w-3.5 mr-1.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-2">
                              {post.description}
                            </p>

                            {/* Actions & Stats */}
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => handleVote(post.id)}
                                  disabled={votingInProgress[post.id]}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 transition-colors ${
                                    votingInProgress[post.id]
                                      ? "opacity-50"
                                      : ""
                                  }`}
                                >
                                  {votingInProgress[post.id] ? (
                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full"></div>
                                  ) : (
                                    <svg
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 15l7-7 7 7"
                                      />
                                    </svg>
                                  )}
                                  <span className="font-medium">
                                    {post.votes}
                                  </span>
                                </button>

                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  <svg
                                    className="h-4 w-4 mr-1.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03 8 9-8s9 3.582 9 8z"
                                    />
                                  </svg>
                                  {post.comments}
                                </div>

                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  <svg
                                    className="h-4 w-4 mr-1.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                  {post.views}
                                </div>
                              </div>

                              <Link
                                href={`/post/${post.id}`}
                                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center"
                              >
                                View Discussion
                                <svg
                                  className="h-4 w-4 ml-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                  />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 0 && (
                  <div className="shadow-sm rounded-xl p-4 bg-[var(--card-background)]">
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
