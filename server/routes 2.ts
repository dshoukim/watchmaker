import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPublicUserSchema, insertRoomSchema, insertVoteSchema, type Room } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

// TMDB Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

const tmdbHeaders = {
  'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

// WebSocket connections map
const wsConnections = new Map<string, Set<WebSocket>>();

async function generateRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  let attempts = 0;
  const MAX_ATTEMPTS = 10; // Prevent infinite loop in case of unforeseen issues

  while (attempts < MAX_ATTEMPTS) {
    result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existingRoom = await storage.getRoomByCode(result);
    if (!existingRoom) {
      return result; // Unique code found
    }
    attempts++;
  }
  throw new Error('Failed to generate a unique room code after multiple attempts.');
}

function broadcastToRoom(roomCode: string, message: any) {
  const connections = wsConnections.get(roomCode);
  if (connections) {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

// Helper to get Supabase client with user's auth
const getSupabaseClient = (req: Request) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Extract JWT
  
  // Assuming supabaseUrl is defined and accessible here
  const supabaseUrl = 'https://qouppyvbepiccepacxne.supabase.co'; // Replace with your actual Supabase URL or process.env variable
  
  if (token) {
    // Create a client with the user's JWT
    return createClient(supabaseUrl, token, { // Pass token as the second argument
      auth: {
        persistSession: false // Prevent saving session on the server
      }
    });
  }
  
  // Fallback to anon client if no token (adjust based on your RLS and needs)
  // You might want to throw an error here if the endpoint strictly requires authentication
  const supabaseKey = process.env.SUPABASE_KEY!; // Use SUPABASE_KEY and non-null assertion
  return createClient(supabaseUrl, supabaseKey);
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    let currentRoomCode: string | null = null;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join-room') {
          currentRoomCode = message.roomCode;
          if (currentRoomCode) {
            if (!wsConnections.has(currentRoomCode)) {
              wsConnections.set(currentRoomCode, new Set());
            }
            wsConnections.get(currentRoomCode)!.add(ws);
            
            // Notify others in room
            broadcastToRoom(currentRoomCode, {
              type: 'user-joined',
              userId: message.userId
            });
          }
        }
        
        if (message.type === 'vote-cast') {
          if (currentRoomCode) {
            broadcastToRoom(currentRoomCode, {
              type: 'vote-update',
              userId: message.userId,
              movieId: message.movieId,
              score: message.score
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (currentRoomCode) {
        const connections = wsConnections.get(currentRoomCode);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            wsConnections.delete(currentRoomCode);
          }
        }
      }
    });
  });

  // Auth Routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      // Map camelCase to snake_case for supabase_id
      const { supabase_id, ...rest } = req.body;
      const userData = insertPublicUserSchema.parse({
        supabase_id: supabase_id,
        ...rest
      });
      
      // Check if user already exists
      const existingUser = await storage.getUserBySupabaseId(userData.supabaseId);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error('Signup validation error:', error);
      res.status(400).json({ error: 'Invalid user data', details: error });
    }
  });

  app.get('/api/auth/user/:supabase_id', async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.params.supabase_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/auth/user/:id/preferences', async (req, res) => {
    try {
      console.log('PUT /api/auth/user/:id/preferences endpoint hit');
      console.log('User ID from params:', req.params.id);
      console.log('Preferences data received:', req.body.preferences);

      const userId = parseInt(req.params.id);
      const { preferences } = req.body;
      
      const user = await storage.updateUserPreferences(userId, preferences);
      console.log('Result of storage.updateUserPreferences:', user);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // TMDB Routes
  app.get('/api/tmdb/genres/:type', async (req, res) => {
    try {
      const type = req.params.type; // 'movie' or 'tv'
      const response = await fetch(`https://api.themoviedb.org/3/genre/${type}/list?language=en-US`, {
        headers: tmdbHeaders
      });
      
      if (!response.ok) {
        throw new Error('TMDB API error');
      }
      
      const data = await response.json();
      res.json(data.genres);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch genres' });
    }
  });

  app.get('/api/tmdb/discover/:type', async (req, res) => {
    try {
      const type = req.params.type; // 'movie' or 'tv'
      const { genres, page = 1 } = req.query;
      
      let url = `https://api.themoviedb.org/3/discover/${type}?language=en-US&page=${page}&sort_by=popularity.desc`;
      
      if (genres) {
        url += `&with_genres=${genres}`;
      }
      
      const response = await fetch(url, { headers: tmdbHeaders });
      
      if (!response.ok) {
        throw new Error('TMDB API error');
      }
      
      const data = await response.json();
      res.json(data.results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  app.get('/api/tmdb/recommendations/:type/:id', async (req, res) => {
    try {
      const { type, id } = req.params;
      const { page = 1 } = req.query;
      
      const response = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/recommendations?language=en-US&page=${page}`,
        { headers: tmdbHeaders }
      );
      
      if (!response.ok) {
        throw new Error('TMDB API error');
      }
      
      const data = await response.json();
      res.json(data.results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  // Room Routes
  app.post('/api/rooms', async (req, res) => {
    try {
      const { hostId } = req.body; // Ensure hostId is the integer ID from public.users
      
      if (!hostId) {
        return res.status(400).json({ error: 'Host ID required' });
      }
      
      const code = await generateRoomCode(); // Now awaits the unique code

      const roomData = insertRoomSchema.parse({
        code,
        hostId, // This should be the integer ID from public.users
        status: 'waiting'
      });
      
      const room = await storage.createRoom(roomData);
      res.status(201).json(room); // 201 Created
    } catch (error) {
      console.error('Failed to create room:', error);
      // More specific error handling based on error type if needed
      if (error instanceof Error && error.message.includes('unique room code')) {
        return res.status(500).json({ error: 'Internal server error: Could not generate unique room code.' });
      }
      res.status(400).json({ error: 'Failed to create room', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/rooms/:code', async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const participants = await storage.getRoomParticipants(room.id); // Part of Phase 1.4
      res.json({ ...room, participants }); // Now including participants
      // res.json(room); // Return basic room data for now
    } catch (error) {
      console.error('Failed to get room:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/rooms/:code/join', async (req, res) => {
    try {
      const { code } = req.params;
      const { userId } = req.body; // This should be the integer ID from public.users

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to join a room' });
      }

      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Check if user is already a participant
      const existingParticipant = await storage.getParticipantByRoomAndUser(room.id, userId);
      if (existingParticipant) {
        return res.status(200).json(existingParticipant); // User already in room, return existing participant info
      }

      const participant = await storage.addParticipant({ roomId: room.id, userId: userId });
      
      // Broadcast user-joined event to other clients in the room
      broadcastToRoom(code, {
        type: 'user-joined',
        userId: userId,
        participantId: participant.id // Or any other relevant participant data
      });
      
      res.status(201).json(participant); // 201 Created for new participant
    } catch (error) {
      console.error('Failed to join room:', error);
      res.status(400).json({ error: 'Failed to join room', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put('/api/rooms/:code/content-type', async (req, res) => {
    try {
      const { contentType } = req.body;
      const room = await storage.getRoomByCode(req.params.code);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Fetch recommendations based on content type
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?language=en-US&page=1&sort_by=popularity.desc`,
        { headers: tmdbHeaders }
      );
      
      if (!response.ok) {
        throw new Error('TMDB API error');
      }
      
      const data = await response.json();
      const recommendations = data.results.slice(0, 10); // Take first 10
      
      const updatedRoom = await storage.updateRoomRecommendations(room.id, recommendations);
      await storage.updateRoomStatus(room.id, 'voting');
      
      // Update content type
      const finalRoom = { ...updatedRoom, contentType, status: 'voting' as const };
      
      // Broadcast to room
      broadcastToRoom(room.code, {
        type: 'voting-started',
        contentType,
        recommendations
      });
      
      res.json(finalRoom);
    } catch (error) {
      res.status(500).json({ error: 'Failed to start voting' });
    }
  });

  // Voting Routes
  app.post('/api/votes', async (req, res) => {
    try {
      const voteData = insertVoteSchema.parse(req.body);
      const vote = await storage.createVote(voteData);
      
      // Check if all participants have voted on all movies
      const roomCode = req.body.roomCode || ''; // Assuming roomCode is passed in vote payload
      let room: Room | undefined;
      if (roomCode) {
        room = await storage.getRoomByCode(roomCode); 
      }

      if (room) {
        const participants = await storage.getRoomParticipants(room.id); // Needs Phase 1.4
        const allVotes = await storage.getRoomVotes(room.id); // Needs Phase 1.5
        const recommendations = Array.isArray(room.recommendations) ? room.recommendations : [];
        
        // Basic check: Ensure participants and recommendations are loaded and are arrays
        if (Array.isArray(participants) && participants.length > 0 && recommendations.length > 0) {
          const expectedVotes = participants.length * recommendations.length;
          
          if (allVotes.length >= expectedVotes) {
            // Calculate results
            const results = calculateResults(allVotes, recommendations);
            await storage.updateRoomResults(room.id, results);
            await storage.updateRoomStatus(room.id, 'completed');
            
            // Broadcast results
            broadcastToRoom(room.code, {
              type: 'voting-completed',
              results
            });
          }
        }
        
        // Broadcast vote update
        broadcastToRoom(room.code, {
          type: 'vote-cast',
          userId: voteData.userId, 
          movieId: voteData.movieId,
          score: voteData.score
        });
      }
      
      res.status(201).json(vote); 
    } catch (error) {
      console.error('Failed to create vote or process voting completion:', error);
      res.status(400).json({ error: 'Failed to create vote', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/rooms/:code/votes', async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const votes = await storage.getRoomVotes(room.id);
      res.json(votes);
    } catch (error) {
      console.error('Failed to get room votes:', error);
      res.status(500).json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/rooms/:code/results', async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      if (room.status !== 'completed' || !room.results) {
        // If results are not yet computed or room not completed, 
        // potentially recalculate or return appropriate status
        // For now, just return what's in DB or indicate not ready.
        return res.status(200).json(room.results || { message: "Results not yet available or room not completed." });
      }
      res.json(room.results);
    } catch (error) {
      console.error('Failed to get room results:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // User Sessions
  app.get('/api/profiles/:id/sessions', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/streaming-services', async (req, res) => {
    try {
      console.log('GET /api/streaming-services endpoint hit');
      console.log('Authorization header:', req.headers['authorization']);
      // Get Supabase client with user's auth context
      const authenticatedSupabase = getSupabaseClient(req);

      // Pass the authenticated client to the storage method
      console.log('Fetching streaming services with Supabase client...');
      const services = await storage.getAllStreamingServices(authenticatedSupabase);
      console.log('Successfully fetched streaming services.', services);
      res.json(services);
    } catch (error) {
      console.error('Failed to fetch streaming services:', error);
      console.error('Streaming services error details:', error);
      res.status(500).json({ error: 'Failed to fetch streaming services' });
    }
  });

  return httpServer;
}

function calculateResults(votes: any[], recommendations: any[]) {
  const movieScores = new Map<number, { 
    movie: any; 
    totalScore: number; 
    votes: { userId: number; score: number }[] 
  }>();
  
  // Initialize scores
  recommendations.forEach(movie => {
    movieScores.set(movie.id, {
      movie,
      totalScore: 0,
      votes: []
    });
  });
  
  // Calculate scores
  votes.forEach(vote => {
    const movieScore = movieScores.get(vote.movieId);
    if (movieScore) {
      movieScore.totalScore += vote.score;
      movieScore.votes.push({
        userId: vote.userId,
        score: vote.score
      });
    }
  });
  
  // Convert to array and sort by score
  return Array.from(movieScores.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(({ movie, totalScore, votes }) => ({
      movieId: movie.id,
      title: movie.title || movie.name,
      poster: movie.poster_path,
      overview: movie.overview,
      releaseDate: movie.release_date || movie.first_air_date,
      voteAverage: movie.vote_average,
      totalScore,
      votes
    }));
}
