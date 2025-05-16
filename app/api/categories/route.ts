import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, protectRoute } from "@/lib/auth";

// GET all categories
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    // No longer fallback to a default list with slugs as IDs.
    // If the database is empty, an empty array will be returned.
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// Create a new category (Admin only)
export async function POST(request: NextRequest) {
  return protectRoute(request, async (req, user) => {
    try {
      // Check if user is admin
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { name } = body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "Category name is required" },
          { status: 400 }
        );
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/\s+/g, "-");

      // Check if category with same name or slug already exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          OR: [{ name }, { slug }],
        },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 409 }
        );
      }

      const newCategory = await prisma.category.create({
        data: {
          name,
          slug,
        },
      });

      return NextResponse.json(newCategory, { status: 201 });
    } catch (error) {
      console.error("Error creating category:", error);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }
  });
}

// DELETE a category (Admin only)
export async function DELETE(request: NextRequest) {
  return protectRoute(request, async (req, user) => {
    try {
      // Check if user is admin
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json(
          { error: "Category ID is required" },
          { status: 400 }
        );
      }

      // First check if category exists
      const category = await prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      // Delete the category
      await prisma.category.delete({
        where: { id },
      });

      return NextResponse.json(
        { message: "Category deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting category:", error);
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 }
      );
    }
  });
}
