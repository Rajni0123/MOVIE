import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@moviehub.com";
  const adminPassword = "admin123"; // Change this in production!

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Admin",
        isActive: true,
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
    console.log(`Default password: ${adminPassword}`);
    console.log("IMPORTANT: Change this password immediately in production!");
  } else {
    console.log("Admin user already exists");
  }

  // Create sample movies with download links
  const sampleMovies = [
    {
      title: "The Matrix",
      slug: "the-matrix-1999",
      description: "A computer programmer discovers that reality as he knows it is a simulation created by machines, and joins a rebellion to break free. Thomas Anderson, a computer programmer by day and hacker by night, discovers a shocking truth about his reality.",
      releaseDate: new Date("1999-03-31"),
      runtime: 136,
      genres: JSON.stringify(["Action", "Science Fiction"]),
      cast: JSON.stringify([
        { name: "Keanu Reeves", character: "Neo" },
        { name: "Laurence Fishburne", character: "Morpheus" },
        { name: "Carrie-Anne Moss", character: "Trinity" },
        { name: "Hugo Weaving", character: "Agent Smith" },
        { name: "Joe Pantoliano", character: "Cypher" }
      ]),
      director: "The Wachowskis",
      rating: 8.7,
      posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=vKQi3bBA1y8",
      screenshots: JSON.stringify([
        "https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
        "https://image.tmdb.org/t/p/w1280/icmmSD4vTTDKOq2vvdulafOGw93.jpg",
        "https://image.tmdb.org/t/p/w1280/7u3pxc0K1wx32IleAkLv78MKgrw.jpg",
        "https://image.tmdb.org/t/p/w1280/qPMVvWjjGQKSsF62cT7dKOA0Slt.jpg",
      ]),
      status: "PUBLISHED",
      tmdbId: "603",
      imdbId: "tt0133093",
      downloadLinks: [
        { sourceName: "Server 1", quality: "1080p", language: "English", linkUrl: "#download-1080p-1" },
        { sourceName: "Server 2", quality: "1080p", language: "English", linkUrl: "#download-1080p-2" },
        { sourceName: "Server 1", quality: "720p", language: "English", linkUrl: "#download-720p-1" },
        { sourceName: "Server 2", quality: "720p", language: "Hindi", linkUrl: "#download-720p-2" },
        { sourceName: "Server 1", quality: "480p", language: "English", linkUrl: "#download-480p-1" },
      ]
    },
    {
      title: "Inception",
      slug: "inception-2010",
      description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O. Dom Cobb is a skilled thief, the absolute best in the dangerous art of extraction.",
      releaseDate: new Date("2010-07-16"),
      runtime: 148,
      genres: JSON.stringify(["Action", "Science Fiction", "Adventure"]),
      cast: JSON.stringify([
        { name: "Leonardo DiCaprio", character: "Cobb" },
        { name: "Joseph Gordon-Levitt", character: "Arthur" },
        { name: "Elliot Page", character: "Ariadne" },
        { name: "Tom Hardy", character: "Eames" },
        { name: "Ken Watanabe", character: "Saito" }
      ]),
      director: "Christopher Nolan",
      rating: 8.4,
      posterUrl: "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
      screenshots: JSON.stringify([
        "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
        "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "https://image.tmdb.org/t/p/w1280/pEPwT8fJKD4VnwLQjaNgLB8PVVV.jpg",
        "https://image.tmdb.org/t/p/w1280/obNe3lH4tkFqJqHaEBaNGNsJIeL.jpg",
      ]),
      status: "PUBLISHED",
      tmdbId: "27205",
      imdbId: "tt1375666",
      downloadLinks: [
        { sourceName: "Server 1", quality: "4K", language: "English", linkUrl: "#download-4k-1" },
        { sourceName: "Server 1", quality: "1080p", language: "English", linkUrl: "#download-1080p-1" },
        { sourceName: "Server 2", quality: "1080p", language: "Hindi", linkUrl: "#download-1080p-2" },
        { sourceName: "Server 1", quality: "720p", language: "English", linkUrl: "#download-720p-1" },
        { sourceName: "Server 1", quality: "480p", language: "English", linkUrl: "#download-480p-1" },
      ]
    },
    {
      title: "Interstellar",
      slug: "interstellar-2014",
      description: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked with piloting a spacecraft along with a team of researchers to find a new planet for humans. A team of explorers travel through a wormhole in space.",
      releaseDate: new Date("2014-11-07"),
      runtime: 169,
      genres: JSON.stringify(["Adventure", "Drama", "Science Fiction"]),
      cast: JSON.stringify([
        { name: "Matthew McConaughey", character: "Cooper" },
        { name: "Anne Hathaway", character: "Brand" },
        { name: "Jessica Chastain", character: "Murph" },
        { name: "Michael Caine", character: "Professor Brand" },
        { name: "Matt Damon", character: "Mann" }
      ]),
      director: "Christopher Nolan",
      rating: 8.6,
      posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
      screenshots: JSON.stringify([
        "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
        "https://image.tmdb.org/t/p/w1280/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
        "https://image.tmdb.org/t/p/w1280/8pSSJbmJKWHqSgXxFdERhRnJgYo.jpg",
        "https://image.tmdb.org/t/p/w1280/xu9Za0m1jqnsXOxU7bdrItVHECu.jpg",
      ]),
      status: "PUBLISHED",
      tmdbId: "157336",
      imdbId: "tt0816692",
      downloadLinks: [
        { sourceName: "Server 1", quality: "4K", language: "English", linkUrl: "#download-4k-1" },
        { sourceName: "Server 2", quality: "4K", language: "English", linkUrl: "#download-4k-2" },
        { sourceName: "Server 1", quality: "1080p", language: "English", linkUrl: "#download-1080p-1" },
        { sourceName: "Server 2", quality: "1080p", language: "Dual Audio", linkUrl: "#download-1080p-2" },
        { sourceName: "Server 1", quality: "720p", language: "English", linkUrl: "#download-720p-1" },
        { sourceName: "Server 1", quality: "480p", language: "English", linkUrl: "#download-480p-1" },
      ]
    },
    {
      title: "The Dark Knight",
      slug: "the-dark-knight-2008",
      description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice. With the help of Lt. Jim Gordon and District Attorney Harvey Dent.",
      releaseDate: new Date("2008-07-18"),
      runtime: 152,
      genres: JSON.stringify(["Action", "Crime", "Drama"]),
      cast: JSON.stringify([
        { name: "Christian Bale", character: "Bruce Wayne / Batman" },
        { name: "Heath Ledger", character: "Joker" },
        { name: "Aaron Eckhart", character: "Harvey Dent" },
        { name: "Michael Caine", character: "Alfred" },
        { name: "Gary Oldman", character: "Commissioner Gordon" }
      ]),
      director: "Christopher Nolan",
      rating: 9.0,
      posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
      screenshots: JSON.stringify([
        "https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
        "https://image.tmdb.org/t/p/w1280/jvlwFKB10sNJpD4xqwqGNsbxcEL.jpg",
        "https://image.tmdb.org/t/p/w1280/nLBRD7UPR6GjmWQp6ASAfCTaWKX.jpg",
        "https://image.tmdb.org/t/p/w1280/tWYd2yrgLhE7xX4M5HqXX2SWJSU.jpg",
      ]),
      status: "PUBLISHED",
      tmdbId: "155",
      imdbId: "tt0468569",
      downloadLinks: [
        { sourceName: "Server 1", quality: "1080p", language: "English", linkUrl: "#download-1080p-1" },
        { sourceName: "Server 2", quality: "1080p", language: "Hindi", linkUrl: "#download-1080p-2" },
        { sourceName: "Server 1", quality: "720p", language: "English", linkUrl: "#download-720p-1" },
        { sourceName: "Server 2", quality: "720p", language: "Dual Audio", linkUrl: "#download-720p-2" },
        { sourceName: "Server 1", quality: "480p", language: "English", linkUrl: "#download-480p-1" },
      ]
    },
    {
      title: "Pulp Fiction",
      slug: "pulp-fiction-1994",
      description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption. A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and more.",
      releaseDate: new Date("1994-10-14"),
      runtime: 154,
      genres: JSON.stringify(["Crime", "Thriller"]),
      cast: JSON.stringify([
        { name: "John Travolta", character: "Vincent Vega" },
        { name: "Uma Thurman", character: "Mia Wallace" },
        { name: "Samuel L. Jackson", character: "Jules Winnfield" },
        { name: "Bruce Willis", character: "Butch Coolidge" },
        { name: "Tim Roth", character: "Pumpkin" }
      ]),
      director: "Quentin Tarantino",
      rating: 8.9,
      posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=s7EdQ4FqbhY",
      screenshots: JSON.stringify([
        "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
        "https://image.tmdb.org/t/p/w1280/vQWk5YBFWF4bZaofAbv8tQgicbn.jpg",
        "https://image.tmdb.org/t/p/w1280/wptOlfrS8A0wLfmxRPkqjrsUICa.jpg",
        "https://image.tmdb.org/t/p/w1280/lfRkUr7DYdHldAqi3PwdQGBRBPM.jpg",
      ]),
      status: "PUBLISHED",
      tmdbId: "680",
      imdbId: "tt0110912",
      downloadLinks: [
        { sourceName: "Server 1", quality: "1080p", language: "English", linkUrl: "#download-1080p-1" },
        { sourceName: "Server 1", quality: "720p", language: "English", linkUrl: "#download-720p-1" },
        { sourceName: "Server 2", quality: "720p", language: "Hindi", linkUrl: "#download-720p-2" },
        { sourceName: "Server 1", quality: "480p", language: "English", linkUrl: "#download-480p-1" },
      ]
    },
  ];

  for (const movieData of sampleMovies) {
    const { downloadLinks, ...movie } = movieData;
    
    const existing = await prisma.movie.findUnique({
      where: { slug: movie.slug },
    });

    if (!existing) {
      const created = await prisma.movie.create({
        data: movie,
      });

      // Create download links
      for (const link of downloadLinks) {
        await prisma.streamingLink.create({
          data: {
            movieId: created.id,
            sourceName: link.sourceName,
            quality: link.quality,
            language: link.language,
            linkUrl: link.linkUrl,
            isActive: true,
            priority: link.quality === '4K' ? 100 : link.quality === '1080p' ? 80 : link.quality === '720p' ? 60 : 40,
          },
        });
      }

      // Create SEO status
      await prisma.seoIndexStatus.create({
        data: { movieId: created.id },
      });

      console.log(`Created movie: ${movie.title} with ${downloadLinks.length} download links`);
    }
  }

  // Create TMDB scraping source
  const tmdbSource = await prisma.scrapingSource.findFirst({
    where: { name: "TMDB API" },
  });

  if (!tmdbSource) {
    await prisma.scrapingSource.create({
      data: {
        name: "TMDB API",
        baseUrl: "https://api.themoviedb.org/3",
        scrapingRules: JSON.stringify({
          type: "api",
          endpoints: {
            popular: "/movie/popular",
            topRated: "/movie/top_rated",
            nowPlaying: "/movie/now_playing",
            upcoming: "/movie/upcoming",
            details: "/movie/{id}",
            credits: "/movie/{id}/credits",
            images: "/movie/{id}/images",
          },
        }),
        isActive: true,
      },
    });
    console.log("Created TMDB scraping source");
  }

  // Create sample notifications
  const existingNotifications = await prisma.notification.count();
  
  if (existingNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        {
          title: "🎬 Welcome to MovPix!",
          message: "Download your favorite movies in HD quality. Join our Telegram for latest updates!",
          type: "info",
          linkUrl: "https://t.me/moviehub",
          linkText: "Join Telegram",
          isActive: true,
        },
        {
          title: "🔥 New Movies Added Daily",
          message: "We add new movies every day. Check back regularly for fresh content!",
          type: "success",
          isActive: true,
        },
      ],
    });
    console.log("Sample notifications created");
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
