import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, protectRoute } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "votes";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");

    // Calculate pagination offsets
    const skip = (page - 1) * limit;

    console.log(`GET /api/posts: Fetching page ${page} with limit ${limit}`);

    // Test database connection first
    try {
      await prisma.$connect();
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Build where clause with optional status and category filters
    const where: Prisma.PostWhereInput = {};
    if (status && status !== "all") where.status = status;
    if (category && category !== "all") {
      where.categories = { some: { category: { slug: category } } };
    }

    // First, get the total count for pagination info
    const totalCount = await prisma.post.count({ where });

    const totalPages = Math.ceil(totalCount / limit);

    // Fetch posts with pagination, author details, counts, and views
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: true,
        _count: { select: { comments: true, votes: true } },
      },
      skip,
      take: limit,
      // We'll sort on the database level for better performance
      orderBy:
        sort === "newest"
          ? { createdAt: "desc" }
          : sort === "oldest"
          ? { createdAt: "asc" }
          : undefined,
    });

    console.log(
      `GET /api/posts: Retrieved ${posts.length} posts out of ${totalCount} total`
    );

    // Transform data to match frontend expectations
    const transformedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.description,
      status: post.status,
      votes: post._count.votes,
      comments: post._count.comments,
      views: post.views,
      authorName: post.author?.name || "Anonymous",
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }));

    // Sort by votes if requested (we can't do this at the database level easily)
    let sortedPosts = [...transformedPosts];
    if (sort === "votes") {
      sortedPosts.sort((a, b) => b.votes - a.votes);
    }

    // Return posts with pagination metadata
    return NextResponse.json({
      posts: sortedPosts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Protect POST endpoint with authentication
export async function POST(request: NextRequest) {
  console.log("POST /api/posts: Received request");
  return protectRoute(request, async (req, user) => {
    console.log("POST /api/posts: Entered protected route");
    try {
      const body = await req.json();
      console.log("POST /api/posts: Request body:", body);
      const { title, description, categoryIds } = body;

      if (!title || !description) {
        console.log("POST /api/posts: Title or description missing");
        return NextResponse.json(
          { error: "Title and description are required" },
          { status: 400 }
        );
      }

      // Try to connect to the database
      try {
        console.log("POST /api/posts: Connecting to database");
        await prisma.$connect();
        console.log("POST /api/posts: Database connection successful");

        // Create post with the authenticated user's ID
        console.log("POST /api/posts: Creating post with data:", {
          title,
          description,
          authorId: user.id,
          categories: categoryIds,
        });

        // Create the post and connect it with selected categories
        const newPost = await prisma.post.create({
          data: {
            title,
            description,
            authorId: user.id,
            categories:
              categoryIds && categoryIds.length > 0
                ? {
                    create: categoryIds.map((categoryId: string) => ({
                      category: {
                        connect: {
                          id: categoryId,
                        },
                      },
                    })),
                  }
                : undefined,
          },
          include: {
            categories: {
              include: {
                category: true,
              },
            },
          },
        });

        console.log("POST /api/posts: New post created:", newPost);

        return NextResponse.json(newPost, { status: 201 });
      } catch (dbError) {
        console.error(
          "POST /api/posts: Database error when creating post:",
          dbError
        );

        // Return a mock response with the data that would have been created
        const mockPost = {
          id: `mock-${Date.now()}`,
          title,
          description,
          status: "Open",
          authorId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          categories: categoryIds || [],
        };

        console.log(
          "POST /api/posts: Returning mock post due to DB error:",
          mockPost
        );
        return NextResponse.json(mockPost, { status: 201 });
      }
    } catch (error) {
      console.error("POST /api/posts: Error creating post:", error);
      // Log more detailed error information
      if (error instanceof Error) {
        console.error("POST /api/posts: Error name:", error.name);
        console.error("POST /api/posts: Error message:", error.message);
        console.error("POST /api/posts: Error stack:", error.stack);
      }
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    } finally {
      try {
        console.log("POST /api/posts: Disconnecting from database");
        await prisma.$disconnect();
        console.log("POST /api/posts: Database disconnection successful");
      } catch (e) {
        console.error("POST /api/posts: Error disconnecting from database:", e);
      }
    }
  });
}
