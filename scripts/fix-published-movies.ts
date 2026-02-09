import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixPublishedMovies() {
  try {
    // Find all movies that are PUBLISHED but not active
    const inactivePublished = await prisma.movie.findMany({
      where: {
        status: "PUBLISHED",
        isActive: false,
      },
      select: {
        id: true,
        title: true,
      },
    });

    console.log(`Found ${inactivePublished.length} published movies that are inactive`);

    if (inactivePublished.length === 0) {
      console.log("No movies to fix!");
      await prisma.$disconnect();
      return;
    }

    // Activate them
    const result = await prisma.movie.updateMany({
      where: {
        status: "PUBLISHED",
        isActive: false,
      },
      data: {
        isActive: true,
      },
    });

    console.log(`\n✅ Successfully activated ${result.count} movies!`);
    console.log("\nMovies that were fixed:");
    inactivePublished.forEach((movie) => {
      console.log(`  - ${movie.title} (ID: ${movie.id})`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPublishedMovies();
