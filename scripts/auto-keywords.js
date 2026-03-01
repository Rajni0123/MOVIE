const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Common SEO keywords for movie sites
const COMMON_KEYWORDS = [
  "download", "free download", "watch online", "full movie",
  "HD", "480p", "720p", "1080p", "dual audio", "hindi dubbed"
];

// Generate keywords for a movie
function generateKeywords(movie) {
  const keywords = new Set();

  // 1. Title variations
  const title = movie.title || "";
  keywords.add(title.toLowerCase());
  keywords.add(`${title.toLowerCase()} download`);
  keywords.add(`${title.toLowerCase()} full movie`);
  keywords.add(`${title.toLowerCase()} free download`);
  keywords.add(`download ${title.toLowerCase()}`);
  keywords.add(`watch ${title.toLowerCase()} online`);

  // 2. Year
  let year = "";
  if (movie.releaseDate) {
    year = new Date(movie.releaseDate).getFullYear().toString();
    keywords.add(`${title.toLowerCase()} ${year}`);
    keywords.add(`${title.toLowerCase()} ${year} download`);
    keywords.add(`${year} movies download`);
    keywords.add(`new movies ${year}`);
  }

  // 3. Genres
  if (movie.genres) {
    try {
      const genres = JSON.parse(movie.genres);
      if (Array.isArray(genres)) {
        genres.forEach(genre => {
          const g = genre.toLowerCase();
          keywords.add(g);
          keywords.add(`${g} movies`);
          keywords.add(`${g} movies download`);
          keywords.add(`best ${g} movies`);
          if (year) {
            keywords.add(`${g} movies ${year}`);
          }
        });
      }
    } catch (e) {
      // If genres is a string, split by comma
      const genres = movie.genres.split(",").map(g => g.trim());
      genres.forEach(genre => {
        if (genre) {
          keywords.add(genre.toLowerCase());
          keywords.add(`${genre.toLowerCase()} movies`);
        }
      });
    }
  }

  // 4. Director
  if (movie.director) {
    keywords.add(movie.director.toLowerCase());
    keywords.add(`${movie.director.toLowerCase()} movies`);
  }

  // 5. Cast (first 3 actors)
  if (movie.cast) {
    try {
      let castList = [];
      try {
        castList = JSON.parse(movie.cast);
      } catch {
        castList = movie.cast.split(",").map(c => c.trim());
      }

      if (Array.isArray(castList)) {
        castList.slice(0, 3).forEach(actor => {
          if (actor && typeof actor === 'string') {
            keywords.add(actor.toLowerCase());
            keywords.add(`${actor.toLowerCase()} movies`);
          }
        });
      }
    } catch (e) {
      // Ignore cast parsing errors
    }
  }

  // 6. Quality keywords
  keywords.add(`${title.toLowerCase()} 480p`);
  keywords.add(`${title.toLowerCase()} 720p`);
  keywords.add(`${title.toLowerCase()} 1080p`);
  keywords.add(`${title.toLowerCase()} hd`);
  keywords.add(`${title.toLowerCase()} dual audio`);
  keywords.add(`${title.toLowerCase()} hindi dubbed`);
  keywords.add(`${title.toLowerCase()} hindi`);

  // 7. Common movie keywords
  keywords.add("movie download");
  keywords.add("free movie download");
  keywords.add("hd movies");
  keywords.add("latest movies");
  keywords.add("new movies download");
  keywords.add("bollywood movies");
  keywords.add("hollywood movies");
  keywords.add("hindi movies download");

  // Filter out empty strings and limit to 30 keywords
  const keywordArray = Array.from(keywords)
    .filter(k => k && k.length > 2)
    .slice(0, 30);

  return keywordArray.join(", ");
}

async function main() {
  console.log("🚀 Starting Auto-Keywords Script...\n");

  // Fetch all movies
  const movies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      releaseDate: true,
      genres: true,
      director: true,
      cast: true,
      metaKeywords: true,
    }
  });

  console.log(`📊 Found ${movies.length} movies\n`);

  let updated = 0;
  let skipped = 0;

  for (const movie of movies) {
    // Generate keywords
    const keywords = generateKeywords(movie);

    // Update movie
    await prisma.movie.update({
      where: { id: movie.id },
      data: { metaKeywords: keywords }
    });

    updated++;
    console.log(`✅ [${updated}/${movies.length}] ${movie.title}`);
    console.log(`   Keywords: ${keywords.slice(0, 100)}...`);
    console.log("");
  }

  console.log("\n========================================");
  console.log(`✅ Updated: ${updated} movies`);
  console.log(`⏭️  Skipped: ${skipped} movies`);
  console.log("========================================\n");

  console.log("🎉 Auto-Keywords script completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
