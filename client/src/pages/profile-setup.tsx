import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getImageUrl, getTitle, getYear, fetchGenres, fetchDiscoverMovies, fetchDiscoverTVShows, type TMDBMovie, type TMDBGenre } from '@/lib/tmdb';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ProfileSetup() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [recommendations, setRecommendations] = useState<TMDBMovie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preferences, setPreferences] = useState({
    genres: [] as string[],
    favoriteMovies: [] as number[],
    favoriteTVShows: [] as number[],
    streamingServices: [] as number[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
  const [streamingServices, setStreamingServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);

  useEffect(() => {
    loadGenres();
    loadStreamingServices();
  }, []);

  // Load recommendations when step becomes 3
  useEffect(() => {
    if (step === 3) {
      loadRecommendations();
    }
  }, [step]);

  const loadGenres = async () => {
    try {
      const [movieGenres, tvGenres] = await Promise.all([
        fetchGenres('movie'),
        fetchGenres('tv')
      ]);
      
      // Combine and deduplicate genres
      const allGenres = [...movieGenres, ...tvGenres].reduce((acc, genre) => {
        if (!acc.find(g => g.name === genre.name)) {
          acc.push(genre);
        }
        return acc;
      }, [] as TMDBGenre[]);
      
      setGenres(allGenres);
    } catch (error) {
      console.error('Error loading genres:', error);
      toast({
        title: "Error",
        description: "Failed to load genres. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadStreamingServices = async () => {
    try {
      const res = await fetch('/api/streaming-services');
      if (!res.ok) throw new Error('Failed to fetch streaming services');
      const data = await res.json();
      setStreamingServices(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load streaming services. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const loadRecommendations = async () => {
    if (selectedGenres.length === 0) {
      toast({
        title: "Select Genres",
        description: "Please select at least one genre to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const genreIds = selectedGenres.join(',');
      const items = contentType === 'movie' 
        ? await fetchDiscoverMovies(genreIds)
        : await fetchDiscoverTVShows(genreIds);
      
      setRecommendations(items.slice(0, 10)); // Take first 10
      setCurrentIndex(0);
      setStep(3); // Move to step 3 after loading recommendations
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreToggle = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleServiceToggle = (id: number) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleRating = (liked: boolean) => {
    const currentMovie = recommendations[currentIndex];
    
    if (liked) {
      if (contentType === 'movie') {
        setPreferences(prev => ({
          ...prev,
          favoriteMovies: [...prev.favoriteMovies, currentMovie.id]
        }));
      } else {
        setPreferences(prev => ({
          ...prev,
          favoriteTVShows: [...prev.favoriteTVShows, currentMovie.id]
        }));
      }
    }

    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Switch to TV shows if we were rating movies
      if (contentType === 'movie') {
        setContentType('tv');
        setCurrentIndex(0);
        loadTVRecommendations();
      } else {
        finishSetup();
      }
    }
  };

  const loadTVRecommendations = async () => {
    setIsLoading(true);
    try {
      const genreIds = selectedGenres.join(',');
      const items = await fetchDiscoverTVShows(genreIds);
      setRecommendations(items.slice(0, 10));
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading TV recommendations:', error);
      finishSetup(); // Skip TV shows if error
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFromGenres = () => {
    if (selectedGenres.length === 0) {
      toast({
        title: 'Select Genres',
        description: 'Please select at least one genre to continue.',
        variant: 'destructive',
      });
      return;
    }
    setStep(2);
  };

  const handleContinueFromServices = () => {
    if (selectedServices.length === 0) {
      toast({
        title: 'Select Streaming Services',
        description: 'Please select at least one streaming service to continue.',
        variant: 'destructive',
      });
      return;
    }
    setPreferences(prev => ({ ...prev, streamingServices: selectedServices }));
    setStep(3); // Move to step 3
  };

  const finishSetup = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const finalPreferences = {
        ...preferences,
        genres: selectedGenres,
        streamingServices: selectedServices,
      };

      console.log('Submitting profile preferences:', finalPreferences);
      const apiUrl = `/api/auth/user/${user.id}/preferences`;
      console.log('API URL:', apiUrl);

      const response = await apiRequest('PUT', apiUrl, {
        preferences: finalPreferences
      });

      console.log('API Response:', response);

      await refreshUser();

      toast({
        title: "Profile Complete!",
        description: "Your preferences have been saved. You can now create or join watch rooms.",
      });

      // Redirect to dashboard using navigate
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentMovie = recommendations[currentIndex];
  const isMovieStep = contentType === 'movie';
  const totalSteps = recommendations.length * 2; // Movies + TV shows
  const currentStep = isMovieStep ? currentIndex + 1 : recommendations.length + currentIndex + 1;

  const progress = step === 1 ? 0 :
                   step === 2 ? 33 :
                   step === 3 ? 66 + (recommendations.length > 0 ? ((currentIndex + 1) / recommendations.length) * 34 : 0) :
                   100;

  if (step === 1) {
    return (
      <div className="min-h-screen px-6 py-8 bg-black">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Build Your Profile</h2>
            <p className="text-gray-400">Help us understand your taste in movies and TV shows</p>
            <div className="mt-4">
              <Progress value={progress} className="h-2 bg-gray-800" />
              <span className="text-sm text-gray-400 mt-2 block">Step 1 of 3</span>
            </div>
          </div>

          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white">What genres do you enjoy?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {genres.map((genre) => (
                  <Button
                    key={genre.id}
                    variant={selectedGenres.includes(genre.id.toString()) ? "default" : "outline"}
                    className={`h-auto p-4 text-center ${
                      selectedGenres.includes(genre.id.toString())
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                    }`}
                    onClick={() => handleGenreToggle(genre.id.toString())}
                  >
                    {genre.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleContinueFromGenres}
            disabled={selectedGenres.length === 0 || isLoading}
            className="w-full bg-red-600 hover:bg-red-700 py-4 text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen px-6 py-8 bg-black">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Which streaming services do you subscribe to?</h2>
            <p className="text-gray-400">Select all that apply</p>
            <div className="mt-4">
              <Progress value={progress} className="h-2 bg-gray-800" />
              <span className="text-sm text-gray-400 mt-2 block">Step 2 of 3</span>
            </div>
          </div>

          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Streaming Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {streamingServices.map((service) => (
                  <Button
                    key={service.id}
                    variant={selectedServices.includes(service.id) ? "default" : "outline"}
                    className={`h-auto p-4 flex flex-col items-center text-center ${
                      selectedServices.includes(service.id)
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                    }`}
                    onClick={() => handleServiceToggle(service.id)}
                  >
                    {service.logoUrl && (
                      <img src={service.logoUrl} alt={service.name} className="h-8 mb-2" />
                    )}
                    {service.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleContinueFromServices}
            disabled={selectedServices.length === 0 || isLoading}
            className="w-full bg-red-600 hover:bg-red-700 py-4 text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 3 && currentMovie) {
    return (
      <div className="min-h-screen px-6 py-8 bg-black">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Rate Some {isMovieStep ? 'Movies' : 'TV Shows'}</h2>
            <p className="text-gray-400">Help us understand your preferences</p>
            <div className="mt-4">
              <Progress value={progress} className="h-2 bg-gray-800" />
              <span className="text-sm text-gray-400 mt-2 block">
                {currentStep} of {totalSteps} rated
              </span>
            </div>
          </div>

          <Card className="bg-gray-900 border-gray-800 overflow-hidden mb-6">
            <div className="relative">
              <img
                src={getImageUrl(currentMovie.poster_path)}
                alt={getTitle(currentMovie)}
                className="w-full h-80 object-cover"
              />
            </div>
            
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                {getTitle(currentMovie)}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {currentMovie.overview}
              </p>
              
              <div className="flex gap-2 mb-4">
                <Badge variant="secondary" className="bg-red-600 text-white">
                  {isMovieStep ? 'Movie' : 'TV Show'}
                </Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-400">
                  {getYear(currentMovie)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={() => handleRating(false)}
              disabled={isLoading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 font-semibold"
            >
              <ThumbsDown className="w-5 h-5 mr-2" />
              Not Interested
            </Button>
            <Button
              onClick={() => handleRating(true)}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 py-4 font-semibold"
            >
              <ThumbsUp className="w-5 h-5 mr-2" />
              Like It
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-500" />
        <p className="text-gray-400">Setting up your profile...</p>
      </div>
    </div>
  );
}
