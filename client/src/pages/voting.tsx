import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useRoom } from '@/hooks/use-room';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, SkipForward, Eye, ThumbsDown, Heart, Star } from 'lucide-react';
import { SwipeCard } from '@/components/swipe-card';
import { useToast } from '@/hooks/use-toast';
import type { TMDBMovie } from '@/lib/tmdb';

export default function Voting() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { room, recommendations, castVote, votes } = useRoom();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userVotes, setUserVotes] = useState<Map<number, number>>(new Map());
  const [isVoting, setIsVoting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  useEffect(() => {
    if (!room || !user) {
      setLocation('/dashboard');
      return;
    }

    if (room.status === 'completed') {
      setLocation(`/results/${code}`);
      return;
    }

    if (room.status !== 'voting') {
      setLocation(`/room/${code}`);
      return;
    }
  }, [room, user, code]);

  useEffect(() => {
    // Check if we've voted on all movies
    if (userVotes.size === recommendations.length && recommendations.length > 0) {
      setWaitingForPartner(true);
      toast({
        title: "All Done!",
        description: "You've voted on all recommendations. Waiting for your partner...",
      });
    }
  }, [userVotes, recommendations]);

  const handleVote = async (direction: 'left' | 'right' | 'up' | 'down', score: number) => {
    if (!room || !user || isVoting || currentIndex >= recommendations.length) return;

    const currentMovie = recommendations[currentIndex];
    if (!currentMovie || userVotes.has(currentMovie.id)) return;

    setIsVoting(true);
    try {
      await castVote(currentMovie.id, score);
      setUserVotes(prev => new Map(prev).set(currentMovie.id, score));
      
      // Move to next recommendation
      if (currentIndex < recommendations.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }

      // Show feedback
      const messages = {
        'up': '❤️ Love it!',
        'right': '👍 Like it!',
        'left': '👎 Not for me',
        'down': '👁️ Already seen'
      };
      
      toast({
        title: messages[direction],
        description: `Voted on "${currentMovie.title || currentMovie.name}"`,
      });

    } catch (error) {
      console.error('Error casting vote:', error);
      toast({
        title: "Error",
        description: "Failed to cast vote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleGoBack = () => {
    setLocation(`/room/${code}`);
  };

  if (!room || !user || recommendations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  const progress = ((userVotes.size) / recommendations.length) * 100;
  const currentMovie = recommendations[currentIndex];
  const nextMovie = recommendations[currentIndex + 1];
  const votedCount = userVotes.size;
  const totalCount = recommendations.length;

  if (waitingForPartner || votedCount >= totalCount) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <header className="bg-gray-900 px-6 py-4 flex items-center border-b border-gray-800">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mr-4 p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white">Voting Complete</h1>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">All Done!</h2>
            <p className="text-gray-400 mb-6">
              You've voted on all {totalCount} recommendations. 
              {waitingForPartner ? ' Waiting for your partner to finish...' : ' Ready to see results!'}
            </p>
            
            <div className="animate-pulse mb-6">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto animate-spin"></div>
            </div>

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Back to Room
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header with Progress */}
      <header className="bg-gray-900 px-6 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <span className="text-lg font-semibold text-white">
              {votedCount + 1} of {totalCount}
            </span>
            <div className="text-sm text-gray-400">recommendations</div>
          </div>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={currentIndex >= recommendations.length - 1}
            className="p-2 text-gray-400 hover:text-white disabled:opacity-50"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
        <Progress value={progress} className="h-2 bg-gray-800" />
      </header>

      {/* Swipe Card Area */}
      <main className="flex-1 relative px-6 pt-6 pb-32">
        <div className="absolute inset-x-6 top-6 bottom-32">
          {/* Current Card */}
          {currentMovie && (
            <div className="absolute inset-0" style={{ zIndex: 2 }}>
              <SwipeCard
                movie={currentMovie as TMDBMovie}
                onSwipe={handleVote}
                isActive={!isVoting}
              />
            </div>
          )}
          
          {/* Next Card (behind) */}
          {nextMovie && (
            <div 
              className="absolute inset-0 transform scale-95 opacity-50" 
              style={{ zIndex: 1 }}
            >
              <SwipeCard
                movie={nextMovie as TMDBMovie}
                onSwipe={() => {}}
                isActive={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* Voting Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent pt-8 pb-6">
        <div className="flex justify-center items-center gap-4 px-6">
          {/* Seen it (-2) */}
          <Button
            onClick={() => handleVote('down', -2)}
            disabled={isVoting || !currentMovie}
            className="w-14 h-14 bg-orange-600 hover:bg-orange-700 rounded-full p-0 transition-all hover:scale-110 active:scale-95"
          >
            <Eye className="w-6 h-6" />
          </Button>
          
          {/* Dislike (-1) */}
          <Button
            onClick={() => handleVote('left', -1)}
            disabled={isVoting || !currentMovie}
            className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full p-0 transition-all hover:scale-110 active:scale-95"
          >
            <ThumbsDown className="w-6 h-6" />
          </Button>
          
          {/* Like (+1) */}
          <Button
            onClick={() => handleVote('right', 1)}
            disabled={isVoting || !currentMovie}
            className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full p-0 transition-all hover:scale-110 active:scale-95"
          >
            <Heart className="w-7 h-7" />
          </Button>
          
          {/* Love it (+2) */}
          <Button
            onClick={() => handleVote('up', 2)}
            disabled={isVoting || !currentMovie}
            className="w-14 h-14 bg-pink-600 hover:bg-pink-700 rounded-full p-0 transition-all hover:scale-110 active:scale-95"
          >
            <Star className="w-6 h-6" />
          </Button>
        </div>
        
        {/* Instructions */}
        <div className="text-center mt-4 px-6">
          <p className="text-xs text-gray-400">
            <span className="text-orange-400">👁️ Seen</span> • 
            <span className="text-red-400"> 👎 Dislike</span> • 
            <span className="text-green-400"> ❤️ Like</span> • 
            <span className="text-pink-400"> ⭐ Love</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Swipe or tap to vote
          </p>
        </div>
      </div>
    </div>
  );
}
