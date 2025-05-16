"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import EditPostForm from "@/components/EditPostForm";
import { Button } from "@/components/ui/button";

// Status color mapping - Update to use CSS variables where possible
const STATUS_COLORS = {
  Open: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  Planned:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "In Progress":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// Define interfaces for Post, Comment, and Category
interface Author {
  name?: string | null;
  image?: string | null;
  createdAt: string;
  author?: Author | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  postId: string;
  author?: Author | null;
}

interface Post {
  id: string;
  title: string;
  description: string;
  status: keyof typeof STATUS_COLORS;
  createdAt: string;
  votes: number;
  author?: Author | null;
  authorId?: string;
  userVote?: boolean; // Assuming this indicates if the current user has voted
  categorySlug?: string; // Added categorySlug
}

interface Category {
  name: string;
  slug: string;
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch post details
  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!params.id) {
        setError("Post ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch post data
        const response = await fetch(`/api/posts/${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Post not found");
          } else {
            throw new Error("Failed to fetch post details");
          }
          return;
        }

        const postData = await response.json();
        setPost(postData);

        // Fetch comments
        const commentsResponse = await fetch(
          `/api/comments?postId=${params.id}`
        );
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
      } catch (err) {
        console.error("Error fetching post details:", err);
        setError("Failed to load post details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetails();

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error("Error fetching categories:", e);
      }
    };
    fetchCategories();
  }, [params.id]);

  // Handle voting
  const handleVote = async () => {
    if (!post || votingInProgress) return;

    // Redirect to sign in if not authenticated
    if (!session) {
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`
      );
      return;
    }

    try {
      setVotingInProgress(true);

      const response = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          type: "UPVOTE", // Added vote type
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process vote");
      }

      const data = await response.json();

      // Update the post data with the new vote count
      setPost((prevPost) =>
        prevPost ? { ...prevPost, votes: data.voteCount } : prevPost
      );
    } catch (err) {
      console.error("Error processing vote:", err);
    } finally {
      setVotingInProgress(false);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!commentText.trim()) return;

    // Redirect to sign in if not authenticated
    if (!session) {
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: commentText,
          postId: post!.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit comment");
      }

      const newComment = await response.json();

      // Add the new comment to the list and clear the input
      setComments((prevComments) => [newComment, ...prevComments]);
      setCommentText("");
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle post editing
  const handleEditClick = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleSaveEdit = async (
    updatedPost: Omit<Post, "createdAt" | "votes">
  ) => {
    try {
      const response = await fetch(`/api/posts/${post!.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: updatedPost.title,
          description: updatedPost.description,
          status: updatedPost.status,
          categorySlug: updatedPost.categorySlug,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update post");
      }

      const data = await response.json();
      setPost(data);
      setEditing(false);
    } catch (err) {
      console.error("Error updating post:", err);
      throw err;
    }
  };

  // Check if current user is the post author or admin
  const isAuthorOrAdmin =
    session?.user &&
    post &&
    (session.user.id === post.authorId || session.user.role === "ADMIN");

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[color:var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-[color:var(--card)] p-8 rounded-xl shadow-xl max-w-md w-full">
          <img
            src="/window.svg"
            alt="Error"
            className="mx-auto h-24 w-auto mb-6 opacity-70"
          />
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Oops! Something went wrong.
          </h1>
          <p className="text-[color:var(--foreground)] mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-[color:var(--primary)] hover:bg-[color:var(--primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-black focus:ring-[color:var(--ring)] transition-all duration-150"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-[color:var(--muted-foreground)] hover:text-[color:var(--primary)] transition-colors duration-150 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-[color:var(--muted-foreground)] group-hover:text-[color:var(--primary)] transition-colors duration-150"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to all requests
          </Link>
        </div>

        {/* Feature Request Card */}
        {editing ? (
          <EditPostForm
            post={post!}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            isAdmin={session?.user?.role === "ADMIN"}
            categories={categories}
          />
        ) : (
          <div className="bg-[color:var(--card)] dark:bg-[color:var(--background)] rounded-xl shadow-xl overflow-hidden mb-10 border-[0.2px] border-[color:var(--border)]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start">
                {/* Voting Button */}
                <div className="mr-0 sm:mr-6 mb-4 sm:mb-0 flex flex-row sm:flex-col items-center sm:items-center w-full sm:w-auto">
                  <button
                    className="p-3 rounded-full hover:bg-[color:var(--accent)] relative transition-colors duration-150 disabled:opacity-60"
                    onClick={handleVote}
                    disabled={votingInProgress || !session}
                    title={!session ? "Sign in to vote" : "Upvote"}
                  >
                    {votingInProgress ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-[color:var(--primary)] border-t-transparent rounded-full"></div>
                      </div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-7 w-7 ${
                          post.userVote
                            ? "text-[color:var(--primary)]"
                            : "text-[color:var(--muted-foreground)]"
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  <span className="font-semibold text-[color:var(--foreground)] text-xl ml-2 sm:ml-0 sm:mt-1">
                    {post.votes}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--foreground)] mb-2 sm:mb-0">
                      {post.title}
                    </h1>
                    <span
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                        STATUS_COLORS[post.status]
                      } whitespace-nowrap`}
                    >
                      {post.status}
                    </span>
                  </div>

                  <div className="text-sm text-[color:var(--muted-foreground)] mb-6">
                    Posted on {new Date(post.createdAt).toLocaleDateString()} by{" "}
                    <span className="font-medium text-[color:var(--foreground)]">
                      {post.author?.name || "Anonymous"}
                    </span>{" "}
                    • {comments.length}{" "}
                    {comments.length === 1 ? "comment" : "comments"}
                  </div>

                  <div className="prose prose-sm sm:prose dark:prose-invert max-w-none text-[color:var(--foreground)] leading-relaxed mb-4">
                    <p>{post.description}</p>
                  </div>

                  {/* Edit button (visible only if user is the author or an admin) */}
                  {isAuthorOrAdmin && (
                    <div className="mt-4">
                      <Button
                        onClick={handleEditClick}
                        variant="outline"
                        size="sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-[var(--card)] dark:bg-[var(--background)] rounded-xl shadow-xl overflow-hidden border-[0.2px] border-[color:var(--border)]">
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[color:var(--foreground)] mb-6">
              Discussion ({comments.length})
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mb-8">
              <div className="mb-3">
                <label htmlFor="comment" className="sr-only">
                  Add a comment
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  className="block w-full px-4 py-3 border border-[color:var(--border)] rounded-lg shadow-sm placeholder-[color:var(--muted-foreground)] focus:outline-none focus:ring-[color:var(--ring)] focus:border-[color:var(--ring)] sm:text-sm bg-[color:var(--card)] text-[color:var(--foreground)] disabled:opacity-70"
                  placeholder={
                    session
                      ? "Share your thoughts..."
                      : "Sign in to join the discussion..."
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!session || submitting}
                />
              </div>
              <div className="flex justify-end">
                {session ? (
                  <button
                    type="submit"
                    disabled={submitting || !commentText.trim()}
                    className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[color:var(--primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[color:var(--background)] focus:ring-[color:var(--ring)] transition-all duration-150 ${
                      submitting || !commentText.trim()
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {submitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        Posting...
                      </>
                    ) : (
                      "Post Comment"
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/auth/signin?callbackUrl=${encodeURIComponent(
                          window.location.href
                        )}`
                      )
                    }
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[color:var(--primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[color:var(--background)] focus:ring-[color:var(--ring)] transition-all duration-150"
                  >
                    Sign in to comment
                  </button>
                )}
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-t border-[color:var(--border)] pt-6"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[color:var(--muted)] flex items-center justify-center text-[color:var(--muted-foreground)] font-semibold text-lg">
                        {comment.author?.image ? (
                          <img
                            src={comment.author.image!}
                            alt={comment.author.name ?? ""}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          comment.author?.name?.[0]?.toUpperCase() || "A"
                        )}
                      </div>
                      <div className="ml-4 flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[color:var(--foreground)]">
                            {comment.author?.name || "Anonymous User"}
                          </p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">
                            {new Date(comment.createdAt).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <div className="mt-1 text-sm text-[color:var(--foreground)] prose prose-sm dark:prose-invert max-w-none">
                          <p>{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <img
                    src="/file.svg"
                    alt="No comments"
                    className="mx-auto h-20 w-auto mb-4 opacity-50"
                  />
                  <p className="text-[color:var(--muted-foreground)]">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
