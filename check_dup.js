const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const movies = await prisma.movie.findMany({
    select: { id: true, title: true, slug: true, releaseDate: true, createdAt: true },
    orderBy: { title: "asc" }
  });

  console.log("Total movies:", movies.length);

  const groups = {};
  for (const movie of movies) {
    // Normalize title - remove year, quality tags, etc.
    const normalized = movie.title
      .toLowerCase()
      .replace(/\(\d{4}\)/g, "") // Remove (2024)
      .replace(/\b(19|20)\d{2}\b/g, "") // Remove years
      .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric

    if (!groups[normalized]) groups[normalized] = [];
    groups[normalized].push(movie);
  }

  let dupCount = 0;
  const toDelete = [];

  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      dupCount++;
      console.log("\n--- Duplicate ---");
      // Sort by createdAt, keep the oldest one
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "N/A";
        const status = i === 0 ? "[KEEP]" : "[DELETE]";
        console.log(status, "ID:", m.id, "| Title:", m.title, "| Year:", year);

        if (i > 0) {
          toDelete.push(m.id);
        }
      }
    }
  }

  console.log("\nTotal duplicate groups:", dupCount);
  console.log("Movies to delete:", toDelete.length);

  if (toDelete.length > 0) {
    console.log("\nDeleting duplicates...");
    const deleted = await prisma.movie.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log("Deleted:", deleted.count, "movies");
  }

  await prisma.$disconnect();
}

run();
