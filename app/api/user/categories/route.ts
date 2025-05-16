import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession, protectRoute } from "@/lib/auth";

// GET user's categories
export async function GET(req: NextRequest) {
  return protectRoute(req, async (request, user) => {
    try {
      const userWithCategories = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userCategories: {
            include: {
              category: true,
            },
            orderBy: {
              category: {
                name: "asc",
              },
            },
          },
        },
      });

      if (!userWithCategories) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const categories = userWithCategories.userCategories.map(
        (uc) => uc.category
      );
      return NextResponse.json(categories);
    } catch (error) {
      console.error("Error fetching user categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch user categories" },
        { status: 500 }
      );
    }
  });
}

// POST to add a category to a user's list (either existing or new custom)
export async function POST(req: NextRequest) {
  return protectRoute(req, async (request, user) => {
    try {
      const body = await request.json();
      const { name, slug } = body;

      if (!name || !slug) {
        return NextResponse.json(
          { error: "Category name and slug are required" },
          { status: 400 }
        );
      }

      // Check if category already exists or create it
      // For this version, we'll assume users can add existing public categories to their list
      // or create new categories that are not marked as 'isDefault'.
      // If they create a new one, it's specific to them unless an admin makes it a default.

      let category = await prisma.category.findUnique({
        where: { slug },
      });

      if (!category) {
        // If category doesn't exist, create it as a non-default category
        category = await prisma.category.create({
          data: {
            name,
            slug,
            isDefault: false, // Custom categories added by users are not default
          },
        });
      }

      // Link category to user
      await prisma.userCategory.upsert({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          categoryId: category.id,
        },
      });

      return NextResponse.json(category, { status: 201 });
    } catch (error) {
      console.error("Error adding user category:", error);
      if (
        error instanceof prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Handle unique constraint violation for slug if category creation was attempted
        // This might happen in a race condition if two users try to create the same slug category
        // or if the findUnique check above passed but another request created it before this one.
        return NextResponse.json(
          {
            error:
              "A category with this slug already exists. Try linking it instead.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to add user category" },
        { status: 500 }
      );
    }
  });
}

// DELETE a category from a user's list
export async function DELETE(req: NextRequest) {
  return protectRoute(req, async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const categoryId = searchParams.get("categoryId");

      if (!categoryId) {
        return NextResponse.json(
          { error: "categoryId is required" },
          { status: 400 }
        );
      }

      // 1. Check if the category itself exists in the Category table
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        // If the category doesn't exist in the general Category table
        return NextResponse.json(
          { error: "Category not found." },
          { status: 404 }
        );
      }

      // 2. Check if it's a default category (users can't remove these)
      if (category.isDefault) {
        return NextResponse.json(
          { error: "Default categories cannot be removed by users." },
          { status: 403 } // Forbidden
        );
      }

      // 3. Attempt to remove the category from the user's list (UserCategory table)
      await prisma.userCategory.delete({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId: categoryId,
          },
        },
      });

      return NextResponse.json(
        { message: "Category removed from user list successfully." },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error removing user category:", error);
      if (error instanceof prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          // This error means the UserCategory record to delete was not found.
          // This implies the category was not in the user's list to begin with,
          // or the categoryId provided was valid but not linked to this user.
          return NextResponse.json(
            {
              error:
                "Category not found in your list or it has already been removed.",
            },
            { status: 404 }
          );
        }
      }
      // Generic error for other issues
      return NextResponse.json(
        { error: "Failed to remove category from user list." },
        { status: 500 }
      );
    }
  });
}
