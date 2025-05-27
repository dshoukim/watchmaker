import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertRoomSchema, insertVoteSchema } from "@shared/schema";

// TMDB Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || "d208a6c1c2cfdca15eb0865db44f32f2";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkMjA4YTZjMWMyY2ZkY2ExNWViMDg2NWRiNDRmMzJmMiIsIm5iZiI6MTc0Nzk2MzQyNi4zNzc5OTk4LCJzdWIiOiI2ODJmY2UyMmMyMGFmOTg2ZTZiNmE1ZjciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.RJrvP8EimCjRbnsK97-hNEqwx28jbB9qZVWe37cP3sM";

const tmdbHeaders = {
  'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

// WebSocket connections map
const wsConnections = new Map<string, Set<WebSocket>>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserBySupabaseId(userData.supabaseId);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  app.get('/api/auth/user/:supabaseId', async (req, res) => {
    try {
      const user = await storage.getUserBySupabaseId(req.params.supabaseId);
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
      const userId = parseInt(req.params.id);
      const { preferences } = req.body;
      
      const user = await storage.updateUserPreferences(userId, preferences);
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
      const { hostId } = req.body;
      
      if (!hostId) {
        return res.status(400).json({ error: 'Host ID required' });
      }
      
      let code: string;
      let existing;
      
      // Generate unique room code
      do {
        code = generateRoomCode();
        existing = await storage.getRoomByCode(code);
      } while (existing);
      
      const roomData = insertRoomSchema.parse({
        code,
        hostId,
        status: 'waiting'
      });
      
      const room = await storage.createRoom(roomData);
      
      // Add host as participant
      await storage.addParticipant({
        roomId: room.id,
        userId: hostId
      });
      
      res.json(room);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create room' });
    }
  });

  app.get('/api/rooms/:code', async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const participants = await storage.getRoomParticipants(room.id);
      res.json({ ...room, participants });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/rooms/:code/join', async (req, res) => {
    try {
      const { userId } = req.body;
      const room = await storage.getRoomByCode(req.params.code);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Check if user already in room
      const existing = await storage.getParticipantByRoomAndUser(room.id, userId);
      if (existing) {
        return res.json({ message: 'Already in room' });
      }
      
      await storage.addParticipant({
        roomId: room.id,
        userId
      });
      
      // Broadcast to room
      broadcastToRoom(room.code, {
        type: 'user-joined',
        userId
      });
      
      res.json({ message: 'Joined room successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to join room' });
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
      const room = await storage.getRoomByCode(req.body.roomCode || '');
      if (room) {
        const participants = await storage.getRoomParticipants(room.id);
        const allVotes = await storage.getRoomVotes(room.id);
        const recommendations = room.recommendations || [];
        
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
        
        // Broadcast vote update
        broadcastToRoom(room.code, {
          type: 'vote-cast',
          userId: voteData.userId,
          movieId: voteData.movieId,
          score: voteData.score
        });
      }
      
      res.json(vote);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create vote' });
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
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/rooms/:code/results', async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      if (room.status !== 'completed') {
        return res.status(400).json({ error: 'Voting not completed' });
      }
      
      res.json(room.results || []);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // User Sessions
  app.get('/api/users/:id/sessions', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
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
