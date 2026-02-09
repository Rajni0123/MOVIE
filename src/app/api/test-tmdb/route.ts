import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "The Night Manager";
  
  const TMDB_API_KEY = process.env.TMDB_API_KEY || "8a8538af2a855e77e8c4a70a48a6447a";
  
  const results: Record<string, unknown> = {
    apiKeyAvailable: !!TMDB_API_KEY,
    apiKeyLength: TMDB_API_KEY?.length,
    searchTitle: title,
  };
  
  try {
    // Test movie search
    const movieSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
    const movieRes = await fetch(movieSearchUrl);
    const movieData = await movieRes.json();
    
    results.movieSearch = {
      status: movieRes.status,
      resultsCount: movieData.results?.length || 0,
      firstResult: movieData.results?.[0] ? {
        id: movieData.results[0].id,
        title: movieData.results[0].title,
        rating: movieData.results[0].vote_average,
      } : null,
    };
    
    // Test TV search
    const tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
    const tvRes = await fetch(tvSearchUrl);
    const tvData = await tvRes.json();
    
    results.tvSearch = {
      status: tvRes.status,
      resultsCount: tvData.results?.length || 0,
      firstResult: tvData.results?.[0] ? {
        id: tvData.results[0].id,
        name: tvData.results[0].name,
        rating: tvData.results[0].vote_average,
      } : null,
    };
    
    // If we found something, get details with videos
    const foundId = tvData.results?.[0]?.id || movieData.results?.[0]?.id;
    const isTV = !!tvData.results?.[0]?.id;
    
    if (foundId) {
      const detailsUrl = isTV 
        ? `https://api.themoviedb.org/3/tv/${foundId}?api_key=${TMDB_API_KEY}&append_to_response=videos`
        : `https://api.themoviedb.org/3/movie/${foundId}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
      
      const detailsRes = await fetch(detailsUrl);
      const details = await detailsRes.json();
      
      results.details = {
        status: detailsRes.status,
        rating: details.vote_average,
        videosCount: details.videos?.results?.length || 0,
        trailers: details.videos?.results?.filter((v: { type: string }) => v.type === "Trailer").map((v: { key: string; type: string; site: string }) => ({
          key: v.key,
          type: v.type,
          site: v.site,
          url: `https://www.youtube.com/watch?v=${v.key}`,
        })) || [],
        backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
      };
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      results 
    });
  }
}
