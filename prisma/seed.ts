import { prisma } from "../lib/db";

async function main() {
  console.log("Starting seed process...");

  const defaultCategories = [
    { name: "Feature Requests", slug: "feature-requests", isDefault: true },
    { name: "Bug Reports", slug: "bug-reports", isDefault: true },
    { name: "Enhancements", slug: "enhancements", isDefault: true },
    {
      name: "General Discussion",
      slug: "general-discussion",
      isDefault: true,
    },
  ];

  console.log(`Found ${defaultCategories.length} default categories to seed.`);

  for (const category of defaultCategories) {
    console.log(
      `Attempting to upsert category: ${category.name} (Slug: ${category.slug})`
    );
    try {
      const result = await prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name, isDefault: category.isDefault },
        create: {
          name: category.name,
          slug: category.slug,
          isDefault: category.isDefault,
        },
      });
      console.log(
        `Successfully upserted category: ${result.name} (ID: ${result.id})`
      );
    } catch (e) {
      console.error(`Failed to upsert category ${category.name}:`, e);
    }
  }
  console.log("Seed process finished.");
}

main()
  .catch((e) => {
    console.error("Unhandled error in main seed function:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Disconnecting Prisma client.");
    await prisma.$disconnect();
  });
