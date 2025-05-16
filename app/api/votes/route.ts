import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const userId = searchParams.get("userId");

    if (!postId || !userId) {
      return NextResponse.json(
        { error: "Post ID and User ID are required" },
        { status: 400 }
      );
    }

    try {
      await prisma.$connect();

      // Check if the user has already voted for this post
      const vote = await prisma.vote.findFirst({
        where: {
          postId,
          userId,
        },
      });

      // Get total vote count for this post
      const voteCount = await prisma.vote.count({
        where: {
          postId,
        },
      });

      return NextResponse.json({
        hasVoted: !!vote,
        voteCount,
      });
    } catch (dbError) {
      console.error("Database error checking vote:", dbError);

      // Return default response as fallback
      return NextResponse.json({
        hasVoted: false,
        voteCount: 0,
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Error checking vote:", error);
    return NextResponse.json(
      { error: "Failed to check vote status" },
      { status: 500 }
    );
  }
}

// POST /api/votes - Create a vote for a post (requires authentication)
export async function POST(request: NextRequest) {
  return protectRoute(request, async (req, user) => {
    try {
      const body = await req.json();
      console.log("POST /api/votes - Request body:", body); // Log the request body
      const { postId, type } = body;

      // Validate required parameters
      if (!postId) {
        return NextResponse.json(
          { error: "Post ID is required" },
          { status: 400 }
        );
      }

      if (!type) {
        // Add validation for type
        return NextResponse.json(
          { error: "Vote type is required" },
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

      // Check if the user has already voted on this post
      const existingVote = await prisma.vote.findUnique({
        where: {
          postId_userId: {
            postId,
            userId: user.id,
          },
        },
      });

      if (existingVote) {
        // Remove the vote (toggle behavior)
        await prisma.vote.delete({
          where: {
            postId_userId: {
              postId,
              userId: user.id,
            },
          },
        });

        // Get updated vote count
        const voteCount = await prisma.vote.count({
          where: { postId },
        });

        return NextResponse.json({
          message: "Vote removed",
          voteCount,
        });
      }

      // Create a new vote
      await prisma.vote.create({
        data: {
          postId,
          userId: user.id,
          type, // Include type here
        },
      });

      // Get updated vote count
      const voteCount = await prisma.vote.count({
        where: { postId },
      });

      return NextResponse.json({
        message: "Vote added",
        voteCount,
      });
    } catch (error) {
      console.error("Error processing vote:", error);
      return NextResponse.json(
        { error: "Failed to process vote" },
        { status: 500 }
      );
    }
  });
}
