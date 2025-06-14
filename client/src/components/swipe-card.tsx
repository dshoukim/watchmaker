import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getImageUrl, getTitle, getYear, type TMDBMovie } from '@/lib/tmdb';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SwipeCardProps {
  movie: TMDBMovie;
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down', score: number) => void;
  isActive?: boolean;
  /** Called when the card is clicked/tapped and not dragging */
  onCardClick?: () => void;
  /** Direction for exit animation, if any */
  exitAnimation?: 'left' | 'right' | 'up' | 'down';
}

export function SwipeCard({ movie, onSwipe, isActive = true, onCardClick, exitAnimation }: SwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, rotation: 0 });
  const [showOverlay, setShowOverlay] = useState<'love' | 'like' | 'dislike' | 'seen' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    if (!isActive) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isActive) return;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    const rotation = deltaX * 0.1;

    setTransform({ x: deltaX * 0.3, y: deltaY * 0.1, rotation });

    // Show overlay based on direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 50) {
        setShowOverlay('like');
      } else if (deltaX < -50) {
        setShowOverlay('dislike');
      } else {
        setShowOverlay(null);
      }
    } else {
      if (deltaY < -50) {
        setShowOverlay('love');
      } else if (deltaY > 50) {
        setShowOverlay('seen');
      } else {
        setShowOverlay(null);
      }
    }
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (!isDragging || !isActive) return;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    const threshold = 100;

    setIsDragging(false);
    setTransform({ x: 0, y: 0, rotation: 0 });
    setShowOverlay(null);

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) {
        onSwipe('right', 1); // Like
      } else if (deltaX < -threshold) {
        onSwipe('left', -1); // Dislike
      }
    } else {
      if (deltaY < -threshold) {
        onSwipe('up', 2); // Love
      } else if (deltaY > threshold) {
        onSwipe('down', -2); // Seen
      }
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handleEnd(e.clientX, e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    handleEnd(touch.clientX, touch.clientY);
  };

  // Add click handler for card tap (not drag)
  const handleCardClick = (e: React.MouseEvent) => {
    if (!isDragging && isActive && onCardClick) {
      onCardClick();
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        handleEnd(e.clientX, e.clientY);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  const overlayOpacity = showOverlay ? Math.min(Math.abs(transform.x) / 150 + Math.abs(transform.y) / 150, 1) : 0;

  // Animation classes for exit
  let exitClass = '';
  if (exitAnimation === 'left') exitClass = 'animate-swipe-left';
  if (exitAnimation === 'right') exitClass = 'animate-swipe-right';
  if (exitAnimation === 'up') exitClass = 'animate-swipe-up';
  if (exitAnimation === 'down') exitClass = 'animate-swipe-down';

  return (
    <div className="flex justify-center items-center h-full">
      <Card
        ref={cardRef}
        className={`relative w-full max-w-xs md:max-w-sm bg-gray-900 border-gray-800 overflow-hidden cursor-grab rounded-2xl shadow-xl ${
          isDragging ? 'cursor-grabbing' : ''
        } ${isActive ? '' : 'pointer-events-none'} ${exitClass}`}
        style={{
          transform: `translateX(${transform.x}px) translateY(${transform.y}px) rotate(${transform.rotation}deg)`,
          transition: isDragging || exitAnimation ? 'none' : 'transform 0.3s cubic-bezier(.4,2,.6,1)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Movie Poster with fixed aspect ratio */}
        <div className="relative w-full aspect-[2/3] bg-gray-800">
          <img
            src={getImageUrl(movie.poster_path)}
            alt={getTitle(movie)}
            className="absolute inset-0 w-full h-full object-cover rounded-t-2xl"
            draggable={false}
          />
          
          {/* Swipe Overlays */}
          <div
            className={`absolute inset-0 bg-red-500 bg-opacity-80 flex items-center justify-center transition-opacity duration-200 ${
              showOverlay === 'dislike' ? '' : 'opacity-0'
            }`}
            style={{ opacity: showOverlay === 'dislike' ? overlayOpacity : 0 }}
          >
            <div className="text-white text-6xl font-bold transform -rotate-12">
              ✕
            </div>
          </div>
          
          <div
            className={`absolute inset-0 bg-green-500 bg-opacity-80 flex items-center justify-center transition-opacity duration-200 ${
              showOverlay === 'like' ? '' : 'opacity-0'
            }`}
            style={{ opacity: showOverlay === 'like' ? overlayOpacity : 0 }}
          >
            <div className="text-white text-6xl font-bold transform rotate-12">
              ❤️
            </div>
          </div>
          
          <div
            className={`absolute inset-0 bg-pink-500 bg-opacity-80 flex items-center justify-center transition-opacity duration-200 ${
              showOverlay === 'love' ? '' : 'opacity-0'
            }`}
            style={{ opacity: showOverlay === 'love' ? overlayOpacity : 0 }}
          >
            <div className="text-white text-6xl font-bold">
              ⭐
            </div>
          </div>
          
          <div
            className={`absolute inset-0 bg-orange-500 bg-opacity-80 flex items-center justify-center transition-opacity duration-200 ${
              showOverlay === 'seen' ? '' : 'opacity-0'
            }`}
            style={{ opacity: showOverlay === 'seen' ? overlayOpacity : 0 }}
          >
            <div className="text-white text-6xl font-bold">
              👁️
            </div>
          </div>
        </div>

        {/* Movie Info */}
        <div className="p-4 flex flex-col gap-2">
          <h3 className="text-lg font-bold text-white line-clamp-2">{getTitle(movie)}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{getYear(movie)}</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-white font-medium">{movie.vote_average.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">{movie.overview}</p>
          <Button
            variant="outline"
            className="mt-2 w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={onCardClick}
            type="button"
          >
            View Details
          </Button>
        </div>
      </Card>
    </div>
  );
}
