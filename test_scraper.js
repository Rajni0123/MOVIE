const { PrismaClient } = require("@prisma/client");
const cheerio = require("cheerio");
const prisma = new PrismaClient();

// Same normalization functions from the scraper
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

async function checkDuplicate(title) {
  const coreTitle = extractCoreTitle(title);
  const normalizedInput = normalizeTitle(title);

  const searchTerms = [
    coreTitle,
    coreTitle.split(' ').slice(0, 3).join(' '),
    coreTitle.split(' ').slice(0, 2).join(' '),
  ].filter(t => t.length >= 2);

  for (const searchTerm of searchTerms) {
    const movies = await prisma.movie.findMany({
      where: { title: { contains: searchTerm } },
      select: { id: true, title: true },
      take: 50
    });

    for (const m of movies) {
      const normalizedDb = normalizeTitle(m.title);
      if (normalizedDb === normalizedInput) {
        return { isDuplicate: true, existingMovie: m };
      }
    }
  }

  return { isDuplicate: false };
}

function cleanTitle(title) {
  if (!title) return "";
  return title
    .replace(/\s*[-–|:]\s*(download|watch|stream|free|online|hd|full movie).*$/gi, "")
    .replace(/\s*[-–|:]\s*\S+\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv|movie|film|ist|trade).*$/gi, "")
    .replace(/worldfree4u[.\s]*(com|net|org|trade|ist)?/gi, "")
    .replace(/\s*(480p|720p|1080p|2160p|4k|hdrip|webrip|bluray|dvdrip|300mb|esub|msubs).*$/gi, "")
    .replace(/\s*\([^)]*\.(com|net|org)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

async function discoverMovies() {
  console.log("Discovering movies from WorldFree4u...\n");

  const categoryUrl = "https://worldfree4u.ist/category/bollywood-1080p-movies/";
  const res = await fetch(categoryUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
  });

  const html = await res.text();
  const $ = cheerio.load(html);
  const baseUrl = "https://worldfree4u.ist";
  const movies = [];
  const seenUrls = new Set();

  // Scan all links - looking for movie URLs
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";

    if (!href || seenUrls.has(href)) return;
    if (!href.includes("worldfree4u.ist/")) return;
    if (href.includes("/category/")) return;
    if (href.includes("/tag/")) return;
    if (href.includes("/page/")) return;
    if (href.includes("/author/")) return;

    // Extract URL path
    try {
      const urlPath = new URL(href).pathname;
      if (urlPath.length < 5 || urlPath === "/") return;

      // Should look like a movie URL (has year or movie-like slug)
      if (!/\b(19|20)\d{2}\b/.test(urlPath) &&
          !/[-\/](dual|hindi|dubbed|bollywood|hollywood|south|movie|film)/i.test(urlPath)) {
        return;
      }

      // Get title from URL slug
      const slug = urlPath.split("/").filter(Boolean).pop() || "";
      let title = slug.replace(/-/g, " ");
      title = cleanTitle(title);

      if (!title || title.length < 3) return;

      seenUrls.add(href);
      movies.push({ title, url: href });
    } catch {
      return;
    }
  });

  return movies.slice(0, 10);
}

async function run() {
  console.log("=".repeat(60));
  console.log("WORLD SCRAPER TEST - 10 MOVIES");
  console.log("=".repeat(60));

  // Get initial count
  const initialCount = await prisma.movie.count();
  console.log(`\nInitial movie count: ${initialCount}\n`);

  // Discover movies
  const movies = await discoverMovies();
  console.log(`Discovered ${movies.length} movies\n`);

  if (movies.length === 0) {
    console.log("No movies discovered. Exiting.");
    await prisma.$disconnect();
    return;
  }

  let skipped = 0;
  let wouldScrape = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    console.log(`\n[${i + 1}/${movies.length}] ${movie.title}`);
    console.log(`    URL: ${movie.url}`);

    // Check for duplicates
    const dupCheck = await checkDuplicate(movie.title);

    if (dupCheck.isDuplicate) {
      console.log(`    STATUS: WOULD SKIP (duplicate of ID ${dupCheck.existingMovie.id}: "${dupCheck.existingMovie.title}")`);
      skipped++;
    } else {
      console.log(`    STATUS: WOULD SCRAPE (not a duplicate)`);
      wouldScrape++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("RESULTS (DRY RUN - No actual scraping)");
  console.log("=".repeat(60));
  console.log(`Total checked: ${movies.length}`);
  console.log(`Would scrape (new): ${wouldScrape}`);
  console.log(`Would skip (duplicates): ${skipped}`);
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

run().catch(console.error);
