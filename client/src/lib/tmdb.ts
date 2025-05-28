const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'd208a6c1c2cfdca15eb0865db44f32f2';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids: number[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export function getImageUrl(path: string): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE_URL}${path}`;
}

export async function fetchGenres(type: 'movie' | 'tv'): Promise<TMDBGenre[]> {
  const response = await fetch(`/api/tmdb/genres/${type}`);
  if (!response.ok) {
    throw new Error('Failed to fetch genres');
  }
  return response.json();
}

export async function fetchDiscoverMovies(genres?: string, page = 1): Promise<TMDBMovie[]> {
  let url = `/api/tmdb/discover/movie?page=${page}`;
  if (genres) {
    url += `&genres=${genres}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch movies');
  }
  return response.json();
}

export async function fetchDiscoverTVShows(genres?: string, page = 1): Promise<TMDBMovie[]> {
  let url = `/api/tmdb/discover/tv?page=${page}`;
  if (genres) {
    url += `&genres=${genres}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch TV shows');
  }
  return response.json();
}

export async function fetchRecommendations(type: 'movie' | 'tv', id: number, page = 1): Promise<TMDBMovie[]> {
  const response = await fetch(`/api/tmdb/recommendations/${type}/${id}?page=${page}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  return response.json();
}

export function getTitle(item: TMDBMovie): string {
  return item.title || item.name || 'Unknown Title';
}

export function getReleaseDate(item: TMDBMovie): string {
  return item.release_date || item.first_air_date || '';
}

export function getYear(item: TMDBMovie): string {
  const date = getReleaseDate(item);
  return date ? new Date(date).getFullYear().toString() : '';
}

export async function fetchMovieVideos(movieId: number): Promise<any[]> {
  const res = await fetch(`/api/tmdb/movie/${movieId}/videos`);
  if (!res.ok) throw new Error('Failed to fetch videos');
  const data = await res.json();
  return data.results || [];
}

export async function fetchMovieProviders(movieId: number): Promise<any> {
  const res = await fetch(`/api/tmdb/movie/${movieId}/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  const data = await res.json();
  return data.results || {};
}

export async function fetchMovieDetails(movieId: number): Promise<any> {
  const res = await fetch(`/api/tmdb/movie/${movieId}`);
  if (!res.ok) throw new Error('Failed to fetch movie details');
  return res.json();
}

export async function fetchOMDBRatings(imdbId: string): Promise<any> {
  const apiKey = import.meta.env.VITE_OMDB_API_KEY;
  if (!apiKey) throw new Error('OMDB API key not set');
  const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
  if (!res.ok) throw new Error('Failed to fetch OMDB ratings');
  return res.json();
}
