import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getImageUrl, getTitle, getYear, type TMDBMovie, fetchMovieVideos, fetchMovieProviders, fetchMovieDetails, fetchOMDBRatings } from '@/lib/tmdb';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface MovieDetailModalProps {
  movie: TMDBMovie | null;
  open: boolean;
  onClose: () => void;
}

export function MovieDetailModal({ movie, open, onClose }: MovieDetailModalProps) {
  if (!movie) return null;
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [imdbScore, setImdbScore] = useState<string | null>(null);
  const [rtScore, setRtScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movie || !open) return;
    let isMounted = true;
    setLoading(true);
    setTrailerUrl(null);
    setProviders([]);
    setImdbScore(null);
    setRtScore(null);

    async function fetchAll() {
      try {
        // 1. Get trailer
        const videos = await fetchMovieVideos(movie.id);
        const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        if (isMounted && trailer) setTrailerUrl(`https://www.youtube.com/embed/${trailer.key}`);

        // 2. Get providers
        const provRes = await fetchMovieProviders(movie.id);
        const usProviders = provRes.US?.flatrate || provRes.US?.buy || provRes.US?.rent || [];
        if (isMounted) setProviders(usProviders);

        // 3. Get IMDB/RT scores
        const details = await fetchMovieDetails(movie.id);
        if (details.imdb_id) {
          const omdb = await fetchOMDBRatings(details.imdb_id);
          if (isMounted) {
            setImdbScore(omdb.imdbRating || null);
            const rt = (omdb.Ratings || []).find((r: any) => r.Source === 'Rotten Tomatoes');
            setRtScore(rt ? rt.Value : null);
          }
        }
      } catch (e) {
        // ignore errors, show what we can
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAll();
    return () => { isMounted = false; };
  }, [movie, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">{getTitle(movie)} ({getYear(movie)})</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-4">
          <img
            src={getImageUrl(movie.poster_path)}
            alt={getTitle(movie)}
            className="w-40 h-60 object-cover rounded-lg border border-gray-800"
          />
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-gray-300 text-sm mb-2">{movie.overview}</div>
            <div className="mt-2">
              <div className="font-semibold mb-1">Trailer</div>
              {loading ? (
                <div className="bg-gray-800 rounded p-2 text-gray-400 text-sm">Loading...</div>
              ) : trailerUrl ? (
                <div className="aspect-video bg-black rounded overflow-hidden">
                  <iframe
                    src={trailerUrl}
                    title="Trailer"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    className="w-full h-48"
                  />
                </div>
              ) : (
                <div className="bg-gray-800 rounded p-2 text-gray-400 text-sm">No trailer found</div>
              )}
            </div>
            <div className="mt-2">
              <div className="font-semibold mb-1">Available On</div>
              {loading ? (
                <div className="bg-gray-800 rounded p-2 text-gray-400 text-sm">Loading...</div>
              ) : providers.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {providers.map((p: any) => (
                    <div key={p.provider_id} className="flex flex-col items-center">
                      <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} className="h-8 mb-1" />
                      <span className="text-xs text-gray-300">{p.provider_name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800 rounded p-2 text-gray-400 text-sm">Not available for streaming</div>
              )}
            </div>
            <div className="mt-2 flex gap-4">
              <div>
                <div className="font-semibold mb-1">IMDB</div>
                <div className="bg-gray-800 rounded p-2 text-gray-400 text-sm">{imdbScore || (loading ? 'Loading...' : 'N/A')}</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Rotten Tomatoes</div>
                <div className="bg-gray-800 rounded p-2 text-gray-400 text-sm">{rtScore || (loading ? 'Loading...' : 'N/A')}</div>
              </div>
            </div>
            <Button onClick={onClose} className="mt-4 bg-red-600 hover:bg-red-700">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 