import { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/websocket';
import { useAuth } from './use-auth';
import type { Room } from '@shared/schema';
import { useLocation } from 'wouter';

interface RoomContextType {
  room: Room | null;
  participants: any[];
  recommendations: any[];
  votes: any[];
  results: any[];
  isConnected: boolean;
  joinRoom: (code: string) => Promise<void>;
  createRoom: () => Promise<string>;
  startVoting: (contentType: 'movie' | 'tv') => Promise<void>;
  castVote: (movieId: number, score: number) => Promise<void>;
  leaveRoom: () => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [, navigate] = useLocation();

  const { sendMessage, subscribe } = useWebSocket(room?.code || null, user?.id || null);

  useEffect(() => {
    if (!room || !user) return;

    const unsubscribeUserJoined = subscribe('user-joined', (message) => {
      console.log('User joined:', message.userId);
      // Refresh participants
      fetchRoomData(room.code);
    });

    const unsubscribeVotingStarted = subscribe('voting-started', (message) => {
      setRecommendations(message.recommendations);
      setRoom(prev => prev ? { ...prev, status: 'voting', contentType: message.contentType } : null);
    });

    const unsubscribeVoteCast = subscribe('vote-cast', (message) => {
      setVotes(prev => [...prev, {
        userId: message.userId,
        movieId: message.movieId,
        score: message.score
      }]);
    });

    const unsubscribeVotingCompleted = subscribe('voting-completed', (message) => {
      setResults(message.results);
      setRoom(prev => prev ? { ...prev, status: 'completed' } : null);
    });

    setIsConnected(true);

    return () => {
      unsubscribeUserJoined();
      unsubscribeVotingStarted();
      unsubscribeVoteCast();
      unsubscribeVotingCompleted();
      setIsConnected(false);
    };
  }, [room, user, subscribe]);

  const fetchRoomData = async (code: string) => {
    try {
      const response = await fetch(`/api/rooms/${code}`);
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
        setParticipants(roomData.participants || []);
        setRecommendations(roomData.recommendations || []);
        setResults(roomData.results || []);
      }
    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  const joinRoom = async (code: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      await fetchRoomData(code);
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  };

  const createRoom = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const roomData = await response.json();
      setRoom(roomData);
      setParticipants([{ userId: user.id }]);
      // Navigate to the new room page
      navigate(`/room/${roomData.code}`);
      return roomData.code;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  };

  const startVoting = async (contentType: 'movie' | 'tv') => {
    if (!room) throw new Error('No active room');

    try {
      const response = await fetch(`/api/rooms/${room.code}/content-type`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType })
      });

      if (!response.ok) {
        throw new Error('Failed to start voting');
      }

      const updatedRoom = await response.json();
      setRoom(updatedRoom);
      setRecommendations(updatedRoom.recommendations || []);
    } catch (error) {
      console.error('Error starting voting:', error);
      throw error;
    }
  };

  const castVote = async (movieId: number, score: number) => {
    if (!room || !user) throw new Error('Room or user not available');

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          userId: user.id,
          movieId,
          score,
          roomCode: room.code
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cast vote');
      }

      sendMessage({
        type: 'vote-cast',
        userId: user.id,
        movieId,
        score
      });

    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  };

  const leaveRoom = () => {
    setRoom(null);
    setParticipants([]);
    setRecommendations([]);
    setVotes([]);
    setResults([]);
  };

  return (
    <RoomContext.Provider value={{
      room,
      participants,
      recommendations,
      votes,
      results,
      isConnected,
      joinRoom,
      createRoom,
      startVoting,
      castVote,
      leaveRoom
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}
