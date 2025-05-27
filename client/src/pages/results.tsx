import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useRoom } from '@/hooks/use-room';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Play, RotateCcw, ArrowLeft, Star, Calendar, Clock } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import { useToast } from '@/hooks/use-toast';

interface ResultItem {
  movieId: number;
  title: string;
  poster: string;
  overview: string;
  releaseDate: string;
  voteAverage: number;
  totalScore: number;
  votes: { userId: number; score: number }[];
}

export default function Results() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { room } = useRoom();
  const { toast } = useToast();
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!room || !user) {
      setLocation('/dashboard');
      return;
    }

    if (room.status !== 'completed') {
      setLocation(`/room/${code}`);
      return;
    }

    loadResults();
  }, [room, user, code]);

  const loadResults = async () => {
    if (!code) return;

    try {
      const response = await fetch(`/api/rooms/${code}/results`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        throw new Error('Failed to load results');
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: "Error",
        description: "Failed to load voting results. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWatching = (movie: ResultItem) => {
    toast({
      title: "Great Choice!",
      description: `Time to watch "${movie.title}"! Enjoy your movie night.`,
    });
    
    // In a real app, this might open streaming services or save to watch history
    // For now, we'll just show a success message
  };

  const handleNewSession = () => {
    setLocation(`/room/${code}`);
  };

  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleGoBack = () => {
    setLocation(`/room/${code}`);
  };

  const getYear = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear().toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!room || !user || results.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <header className="bg-gray-900 px-6 py-4 flex items-center border-b border-gray-800">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mr-4 p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Voting Results</h1>
        </header>
        
        <div className="flex items-center justify-center min-h-[80vh] px-6">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Results Yet</h2>
            <p className="text-gray-400 mb-6">
              It looks like voting hasn't been completed yet.
            </p>
            <Button
              onClick={handleGoBack}
              className="bg-red-600 hover:bg-red-700"
            >
              Back to Room
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const winner = results[0];
  const otherResults = results.slice(1, 5); // Show top 5 total

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 px-6 py-4 border-b border-gray-800">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mr-4 p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-white">Voting Results</h1>
            <p className="text-gray-400">Here's what you should watch!</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Winner Section */}
          <div className="text-center">
            <div className="inline-flex items-center bg-red-600 px-4 py-2 rounded-full mb-6">
              <Trophy className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="font-bold text-white">WINNER</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-6">Top Choice</h2>
          </div>

          {/* Winning Movie Card */}
          <Card className="bg-gradient-to-r from-red-600 to-pink-600 border-0 overflow-hidden">
            <CardContent className="p-6">
              <div className="bg-black bg-opacity-30 rounded-xl overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-32 h-48 md:h-auto">
                    <img
                      src={getImageUrl(winner.poster)}
                      alt={winner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6">
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {winner.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                      {winner.releaseDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{getYear(winner.releaseDate)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span>{winner.voteAverage.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-500 text-black px-3 py-1 rounded-full font-bold text-lg">
                        +{winner.totalScore}
                      </div>
                      <span className="text-sm text-gray-300">Total Score</span>
                    </div>

                    <p className="text-sm text-gray-300 mb-6 line-clamp-3">
                      {winner.overview}
                    </p>

                    <Button
                      onClick={() => handleStartWatching(winner)}
                      className="bg-red-600 hover:bg-red-700 font-semibold"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Results */}
          {otherResults.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Other Options</h3>
              <div className="space-y-4">
                {otherResults.map((result, index) => (
                  <Card key={result.movieId} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-20 flex-shrink-0">
                          <img
                            src={getImageUrl(result.poster)}
                            alt={result.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white mb-1 truncate">
                            {result.title}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                            {result.releaseDate && (
                              <span>{getYear(result.releaseDate)}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span>{result.voteAverage.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {result.overview}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold text-lg ${
                            result.totalScore > 0 ? 'text-green-500' : 
                            result.totalScore < 0 ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {result.totalScore > 0 ? '+' : ''}{result.totalScore}
                          </div>
                          <div className="text-xs text-gray-400">points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleNewSession}
              className="w-full bg-red-600 hover:bg-red-700 py-4 font-semibold"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Start New Voting Session
            </Button>
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              className="w-full py-4 font-semibold bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
