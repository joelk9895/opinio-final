import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

// Mock data for fallback when database connection fails
const MOCK_POSTS = [
  {
    id: "1",
    title: "Add dark mode support",
    description:
      "It would be great to have a dark mode option for better viewing at night.",
    status: "Planned",
    votes: 42,
    comments: 8,
    createdAt: "2025-04-28T10:30:00Z",
    updatedAt: "2025-04-28T10:30:00Z",
  },
  {
    id: "2",
    title: "Implement email notifications",
    description:
      "Send email notifications when a feature request status changes or receives a comment.",
    status: "In Progress",
    votes: 37,
    comments: 5,
    createdAt: "2025-05-01T14:45:00Z",
    updatedAt: "2025-05-01T14:45:00Z",
  },
  {
    id: "3",
    title: "Mobile app for iOS and Android",
    description: "Create native mobile apps to access the platform on the go.",
    status: "Open",
    votes: 56,
    comments: 12,
    createdAt: "2025-05-05T09:15:00Z",
    updatedAt: "2025-05-05T09:15:00Z",
  },
  {
    id: "4",
    title: "Integration with Slack",
    description:
      "Allow notifications and updates to be sent to Slack channels.",
    status: "Completed",
    votes: 28,
    comments: 3,
    createdAt: "2025-04-20T11:20:00Z",
    updatedAt: "2025-04-20T11:20:00Z",
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  console.log(`GET /api/posts/${id}: Entered route`);
  try {
    const postId = id;
    console.log(`GET /api/posts/${id}: Post ID: ${postId}`);

    // Test database connection first
    try {
      console.log(`GET /api/posts/${id}: Connecting to database`);
      await prisma.$connect();
      console.log(`GET /api/posts/${id}: Database connection successful`);
    } catch (dbError) {
      console.error(
        `GET /api/posts/${id}: Database connection failed:`,
        dbError
      );
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // First fetch the post to see if it exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      console.log(`GET /api/posts/${id}: Post not found`);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Now increment the views counter using raw SQL
    console.log(`GET /api/posts/${id}: Incrementing view count with raw SQL`);
    await prisma.$executeRaw`
      UPDATE "Post"
      SET views = views + 1
      WHERE id = ${postId};
    `;

    // Fetch the updated post
    console.log(`GET /api/posts/${id}: Fetching post after increment`);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true, // Include author details
        comments: {
          include: {
            author: true, // Include author details for comments
          },
          orderBy: {
            createdAt: "desc", // Order comments by creation date
          },
        },
        _count: {
          select: { votes: true }, // Count votes for the post
        },
      },
    });

    if (!post) {
      console.log(`GET /api/posts/${id}: Post not found after increment`);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    console.log(`GET /api/posts/${id}: Post found:`, post);

    // Check if the user is authenticated to determine their vote status
    const session = await getAuthSession();
    let userVote = null;
    if (session?.user?.id) {
      console.log(
        `GET /api/posts/${id}: User authenticated, checking vote status for user ID: ${session.user.id}`
      );
      const vote = await prisma.vote.findFirst({
        where: {
          postId: postId,
          userId: session.user.id,
        },
      });
      if (vote) {
        userVote = vote.type;
        console.log(`GET /api/posts/${id}: User vote found: ${userVote}`);
      } else {
        console.log(`GET /api/posts/${id}: No vote found for user`);
      }
    }

    // Transform post data to include vote count, user's vote, and views
    const responseData = {
      ...post,
      votes: post._count.votes,
      userVote: userVote,
    };

    console.log(`GET /api/posts/${id}: Returning response data:`, responseData);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`GET /api/posts/${id}: Error fetching post:`, error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error(`GET /api/posts/${id}: Error name:`, error.name);
      console.error(`GET /api/posts/${id}: Error message:`, error.message);
      console.error(`GET /api/posts/${id}: Error stack:`, error.stack);
    }
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  } finally {
    try {
      console.log(`GET /api/posts/${id}: Disconnecting from database`);
      await prisma.$disconnect();
      console.log(`GET /api/posts/${id}: Database disconnection successful`);
    } catch (e) {
      console.error(
        `GET /api/posts/${id}: Error disconnecting from database:`,
        e
      );
    }
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  console.log(`PATCH /api/posts/${id}: Entered route`);
  try {
    const postId = id;
    const session = await getAuthSession();

    // Check if user is authenticated
    if (!session?.user) {
      console.log(`PATCH /api/posts/${id}: Unauthorized - no session`);
      return NextResponse.json(
        { error: "You must be signed in to edit a post" },
        { status: 401 }
      );
    }

    // Get post data from request
    const postData = await request.json();

    // Get the existing post to check ownership
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      console.log(`PATCH /api/posts/${id}: Post not found`);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user is the author or an admin
    const isAuthor = existingPost.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      console.log(
        `PATCH /api/posts/${id}: Unauthorized - not the author or admin`
      );
      return NextResponse.json(
        { error: "You don't have permission to edit this post" },
        { status: 403 }
      );
    }

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: postData.title,
        description: postData.description,
        // Only admins can update status
        ...(isAdmin ? { status: postData.status } : {}),
      },
      include: {
        author: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    console.log(`PATCH /api/posts/${id}: Post updated successfully`);

    // Return the updated post with the same format as GET
    const responseData = {
      ...updatedPost,
      votes: updatedPost._count.votes,
      userVote: null, // We don't need to check for votes in update
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error(`PATCH /api/posts/${id}: Error updating post:`, error);
    if (error instanceof Error) {
      console.error(`PATCH /api/posts/${id}: Error name:`, error.name);
      console.error(`PATCH /api/posts/${id}: Error message:`, error.message);
      console.error(`PATCH /api/posts/${id}: Error stack:`, error.stack);
    }
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error(
        `PATCH /api/posts/${id}: Error disconnecting from database:`,
        e
      );
    }
  }
}
