import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyMovies() {
  try {
    // Check all movies
    const allMovies = await prisma.movie.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        isActive: true,
        slug: true,
      },
    });

    console.log(`\nTotal movies in database: ${allMovies.length}`);
    
    // Check published and active
    const publishedActive = await prisma.movie.findMany({
      where: {
        status: "PUBLISHED",
        isActive: true,
      },
      select: {
        id: true,
        title: true,
      },
    });

    console.log(`\nPublished & Active movies: ${publishedActive.length}`);
    if (publishedActive.length > 0) {
      console.log("\nMovies that should be visible:");
      publishedActive.forEach((m) => console.log(`  - ${m.title} (ID: ${m.id})`));
    }

    // Check for issues
    const publishedInactive = await prisma.movie.count({
      where: {
        status: "PUBLISHED",
        isActive: false,
      },
    });

    const inactive = await prisma.movie.count({
      where: {
        isActive: false,
      },
    });

    if (publishedInactive > 0) {
      console.log(`\n⚠️  Warning: ${publishedInactive} movies are PUBLISHED but INACTIVE`);
    }

    if (inactive > 0) {
      console.log(`\n⚠️  Info: ${inactive} total movies are marked as inactive`);
    }

    // Test the exact query used by homepage
    const latestMovies = await prisma.movie.findMany({
      where: { 
        status: "PUBLISHED",
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    console.log(`\n✅ Homepage query returns: ${latestMovies.length} movies`);
    if (latestMovies.length > 0) {
      console.log("Sample from homepage query:");
      latestMovies.slice(0, 3).forEach((m) => {
        console.log(`  - ${m.title} (Slug: ${m.slug})`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMovies();
