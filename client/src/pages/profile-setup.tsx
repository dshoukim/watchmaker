// Profile Setup Page
// ------------------
// This component guides a new user through building their profile by selecting genres, streaming services, and rating movies/TV shows.
// It saves user preferences to the backend and navigates to the dashboard when complete.
//
// Steps:
// 1. Select genres
// 2. Select streaming services
// 3. Rate movies and TV shows
//
// API interactions:
// - GET /api/streaming-services: Fetches available streaming services
// - PUT /api/auth/user/:id/preferences: Saves user preferences
//
// State:
// - step: Current step in the setup flow
// - selectedGenres, selectedServices: User's selections
// - recommendations: Movies/TV shows to rate
// - preferences: Accumulated user preferences
// - isLoading: Loading state for async actions
//
// Navigation:
// - On completion, navigates to /dashboard

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

// TODO: Need to check here if the user already has a profile set up
// TODO: Every time the user logs in after logging in, we should ask them to review the movie they selected/watched the last time they entered a room.
// TODO: Every time the user rates a new movie, we need to update their profile
// TODO:

/**
 * ProfileSetup component
 * Guides the user through initial profile creation and preference selection.
 */
export default function ProfileSetup() {
  // Auth context provides user info and refreshUser to reload user data
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Step state: 1 = genres, 2 = streaming services, 3 = rating content
  const [step, setStep] = useState(1);
  // User's selected genres (TMDB genre IDs as strings)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  // All available genres (fetched from TMDB)
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  // Recommendations to rate (movies or TV shows)
  const [recommendations, setRecommendations] = useState<TMDBMovie[]>([]);
  // Index of the current movie/TV show being rated
  const [currentIndex, setCurrentIndex] = useState(0);
  // User's accumulated preferences
  const [preferences, setPreferences] = useState({
    genres: [] as string[],
    favoriteMovies: [] as number[],
    favoriteTVShows: [] as number[],
    streamingServices: [] as number[],
  });
  // Loading state for async actions
  const [isLoading, setIsLoading] = useState(false);
  // Whether we're rating movies or TV shows
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');
  // All available streaming services (from backend)
  const [streamingServices, setStreamingServices] = useState<any[]>([]);
  // User's selected streaming services (IDs)
  const [selectedServices, setSelectedServices] = useState<number[]>([]);

  // On mount, load genres and streaming services
  useEffect(() => {
    loadGenres();
    loadStreamingServices();
  }, []);

  // When step becomes 3, load recommendations to rate
  useEffect(() => {
    if (step === 3) {
      loadRecommendations();
    }
  }, [step]);

  /**
   * Fetches and combines movie and TV genres from TMDB.
   * Deduplicates by genre name.
   */
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

  /**
   * Fetches available streaming services from the backend API.
   */
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

  /**
   * Loads movie or TV recommendations for the user to rate, based on selected genres.
   */
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

  /**
   * Handles toggling a genre selection.
   * @param genreId TMDB genre ID as string
   */
  const handleGenreToggle = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  /**
   * Handles toggling a streaming service selection.
   * @param id Streaming service ID
   */
  const handleServiceToggle = (id: number) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  /**
   * Handles rating a movie or TV show (like/dislike).
   * Updates preferences and advances to the next item or step.
   * @param liked Whether the user liked the item
   */
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

  /**
   * Loads TV show recommendations for the user to rate.
   * Called after rating movies.
   */
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

  /**
   * Advances from genre selection to streaming services step.
   * Validates that at least one genre is selected.
   */
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

  /**
   * Advances from streaming services to rating step.
   * Validates that at least one service is selected.
   */
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

  /**
   * Finalizes profile setup by saving preferences to the backend and navigating to dashboard.
   * Calls PUT /api/auth/user/:id/preferences and refreshes user data.
   */
  const finishSetup = async () => {
    console.log('[ProfileSetup] Entered finishSetup');
    if (!user) {
      console.log('[ProfileSetup] No user found, aborting finishSetup');
      return;
    }

    setIsLoading(true);
    try {
      const finalPreferences = {
        ...preferences,
        genres: selectedGenres,
        streamingServices: selectedServices,
      };

      console.log('[ProfileSetup] Submitting profile preferences:', finalPreferences);
      const apiUrl = `/api/auth/user/${user.id}/preferences`;
      console.log('[ProfileSetup] API URL:', apiUrl);

      const response = await apiRequest('PUT', apiUrl, {
        preferences: finalPreferences
      });

      console.log('[ProfileSetup] API Response:', response);

      console.log('[ProfileSetup] Calling refreshUser...');
      await refreshUser();
      console.log('[ProfileSetup] refreshUser complete');

      toast({
        title: "Profile Complete!",
        description: "Your preferences have been saved. You can now create or join watch rooms.",
      });
      console.log('[ProfileSetup] Toast shown, navigating to /dashboard');

      // Redirect to dashboard using navigate
      navigate('/dashboard');
      console.log('[ProfileSetup] Navigation to /dashboard triggered');
    } catch (error) {
      console.error('[ProfileSetup] Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      console.log('[ProfileSetup] finishSetup complete, isLoading set to false');
    }
  };

  // Current movie/TV show being rated
  const currentMovie = recommendations[currentIndex];
  // Whether we're on the movie or TV step
  const isMovieStep = contentType === 'movie';
  // Total steps for progress bar
  const totalSteps = recommendations.length * 2; // Movies + TV shows
  // Current step for progress bar
  const currentStep = isMovieStep ? currentIndex + 1 : recommendations.length + currentIndex + 1;
  // Progress bar value
  const progress = step === 1 ? 0 :
                   step === 2 ? 33 :
                   step === 3 ? 66 + (recommendations.length > 0 ? ((currentIndex + 1) / recommendations.length) * 34 : 0) :
                   100;

  // Render genre selection step
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

  // Render streaming services selection step
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

  // Render rating step (movies or TV shows)
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

  // Render loading/fallback state
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-500" />
        <p className="text-gray-400">Setting up your profile...</p>
      </div>
    </div>
  );
}
