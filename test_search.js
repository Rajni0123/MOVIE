const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  // Get a movie that exists
  const movie = await prisma.movie.findFirst({
    where: { title: { contains: "Delivery Boy" } },
    select: { id: true, title: true }
  });

  console.log("Existing movie:", movie);

  // Test normalization
  const normalizeTitle = (title) => {
    return title.toLowerCase()
      .replace(/\(\d{4}\)/g, '')
      .replace(/\[\d{4}\]/g, '')
      .replace(/\b(19|20)\d{2}\b/g, '')
      .replace(/hindi|dubbed|hd|netflix|complete|season|dual\s*audio|hdrip|bluray|webrip|camrip|hdtc|hdts|hdcam|dvdrip|brrip|web-dl|amzn|nf|hmax/gi, '')
      .replace(/v2|v3|v4|proper|x264|x265|hevc|10bit|esub|msubs|aac/gi, '')
      .replace(/480p|720p|1080p|2160p|4k|300mb|400mb|500mb|600mb|700mb|800mb|1gb|2gb/gi, '')
      .replace(/download|movie|film|free|watch|online|stream|full/gi, '')
      .replace(/worldfree4u/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Test with similar titles
  const titles = [
    "Delivery Boy Pizza On Time (2026)",
    "Delivery Boy Pizza On Time",
    "Delivery Boy Pizza On Time 2026",
    "Delivery Boy: Pizza On Time (2026) Hindi Dubbed"
  ];

  console.log("\nNormalization test:");
  for (const t of titles) {
    console.log(`"${t}" -> "${normalizeTitle(t)}"`);
  }

  // Search for Delivery Boy movies
  const movies = await prisma.movie.findMany({
    where: {
      title: { contains: "Delivery" }
    },
    select: { id: true, title: true }
  });

  console.log("\nAll movies with 'Delivery' in title:", movies.length);
  for (const m of movies) {
    console.log(`- ID ${m.id}: "${m.title}" -> "${normalizeTitle(m.title)}"`);
  }

  await prisma.$disconnect();
}

test();
