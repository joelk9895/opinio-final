import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { protectRoute } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/comments - Create a new comment (requires authentication)
export async function POST(request: NextRequest) {
  return protectRoute(request, async (req, user) => {
    try {
      const { content, postId } = await req.json();

      if (!content || !postId) {
        return NextResponse.json(
          { error: "Content and Post ID are required" },
          { status: 400 }
        );
      }

      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      // Create comment
      const newComment = await prisma.comment.create({
        data: {
          content,
          postId,
          authorId: user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Update comment count in post
      await prisma.post.update({
        where: { id: postId },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(newComment, { status: 201 });
    } catch (error) {
      console.error("Error creating comment:", error);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }
  });
}
