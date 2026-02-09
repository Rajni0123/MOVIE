import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkMovieStatus() {
  try {
    const total = await prisma.movie.count();
    const published = await prisma.movie.count({ where: { status: "PUBLISHED" } });
    const active = await prisma.movie.count({ where: { isActive: true } });
    const publishedAndActive = await prisma.movie.count({
      where: { status: "PUBLISHED", isActive: true },
    });
    const publishedButInactive = await prisma.movie.count({
      where: { status: "PUBLISHED", isActive: false },
    });

    console.log("\n📊 Movie Status Summary:");
    console.log(`Total movies: ${total}`);
    console.log(`Published: ${published}`);
    console.log(`Active: ${active}`);
    console.log(`Published AND Active: ${publishedAndActive}`);
    console.log(`Published BUT Inactive: ${publishedButInactive}`);

    if (publishedButInactive > 0) {
      console.log("\n⚠️  Found published movies that are inactive:");
      const movies = await prisma.movie.findMany({
        where: { status: "PUBLISHED", isActive: false },
        select: { id: true, title: true, status: true, isActive: true },
        take: 10,
      });
      movies.forEach((m) => {
        console.log(`  - ${m.title} (ID: ${m.id})`);
      });
    }

    // Check what homepage query would return
    const homepageMovies = await prisma.movie.findMany({
      where: { status: "PUBLISHED", isActive: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, title: true },
    });

    console.log(`\n✅ Homepage would show ${homepageMovies.length} movies:`);
    homepageMovies.forEach((m) => {
      console.log(`  - ${m.title} (ID: ${m.id})`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMovieStatus();
