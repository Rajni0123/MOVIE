const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Same functions from the scraper
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

const extractCoreTitle = (title) => {
  let core = title
    .replace(/\s*(dual\s*audio|hindi\s*dubbed|hindi|dubbed|hdrip|bluray|webrip|camrip|hdtc|hdts|hdcam|300mb|400mb|480p|720p|1080p|2160p|download|movie).*/i, '')
    .replace(/\s*\(\d{4}\).*/, '')
    .replace(/\s*\|\|.*/, '')
    .replace(/\s*\b(19|20)\d{2}\b.*/, '')
    .trim();
  return core.length > 2 ? core : title.split(/\s+/).slice(0, 3).join(' ');
};

async function testDuplicateCheck(title) {
  console.log(`\n=== Testing: "${title}" ===`);

  const coreTitle = extractCoreTitle(title);
  const normalizedInput = normalizeTitle(title);
  console.log(`Core: "${coreTitle}" | Normalized: "${normalizedInput}"`);

  // Search with multiple variations
  const searchTerms = [
    coreTitle,
    coreTitle.split(' ').slice(0, 3).join(' '),
    coreTitle.split(' ').slice(0, 2).join(' '),
  ].filter(t => t.length >= 2);

  for (const searchTerm of searchTerms) {
    console.log(`\nSearching for: "${searchTerm}"`);

    // Use Prisma's contains (SQLite will do case-sensitive, but we normalize anyway)
    const movies = await prisma.movie.findMany({
      where: {
        title: { contains: searchTerm }
      },
      select: { id: true, title: true },
      take: 50
    });

    if (movies.length > 0) {
      console.log(`Found ${movies.length} results:`);

      for (const m of movies) {
        const normalizedDb = normalizeTitle(m.title);

        // Exact match
        if (normalizedDb === normalizedInput) {
          console.log(`  EXACT MATCH: ID ${m.id} "${m.title}"`);
          return true;
        }

        // Partial match
        if (normalizedInput.length >= 5 && normalizedDb.length >= 5) {
          if (normalizedDb.includes(normalizedInput) || normalizedInput.includes(normalizedDb)) {
            const lenDiff = Math.abs(normalizedDb.length - normalizedInput.length);
            if (lenDiff <= 3) {
              console.log(`  PARTIAL MATCH: ID ${m.id} "${m.title}" (diff: ${lenDiff})`);
              return true;
            }
          }
        }

        console.log(`  No match: ID ${m.id} "${m.title}" -> "${normalizedDb}"`);
      }
    } else {
      console.log(`No results found`);
    }
  }

  console.log(`\nRESULT: NOT A DUPLICATE`);
  return false;
}

async function run() {
  // Test with titles that should be detected as duplicates
  const testTitles = [
    "Delivery Boy Pizza On Time",
    "Delivery Boy Pizza On Time (2026)",
    "Delivery Boy Pizza On Time 2026 Hindi Dubbed 720p",
    "Mardaani",
    "Mardaani (2014)",
    "Mardaani 2014 Hindi Movie",
    // This should NOT be a duplicate
    "Some Random Movie That Does Not Exist 2025",
  ];

  for (const title of testTitles) {
    const isDup = await testDuplicateCheck(title);
    console.log(`\n>>> "${title}" is ${isDup ? "DUPLICATE" : "NEW"}\n${"=".repeat(60)}`);
  }

  await prisma.$disconnect();
}

run();
