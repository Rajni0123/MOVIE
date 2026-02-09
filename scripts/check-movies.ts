import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkMovies() {
  try {
    const count = await prisma.movie.count({
      where: { status: "PUBLISHED" },
    });
    console.log(`Published movies: ${count}`);

    const movies = await prisma.movie.findMany({
      where: { status: "PUBLISHED" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        isActive: true,
        slug: true,
      },
    });

    console.log("\nSample movies:");
    movies.forEach((movie) => {
      console.log(`- ${movie.title} (ID: ${movie.id}, Active: ${movie.isActive}, Status: ${movie.status}, Slug: ${movie.slug})`);
    });

    // Check if any movies are inactive
    const inactiveCount = await prisma.movie.count({
      where: {
        status: "PUBLISHED",
        isActive: false,
      },
    });

    if (inactiveCount > 0) {
      console.log(`\n⚠️  Warning: ${inactiveCount} published movies are marked as inactive`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMovies();
