/**
 * API Routes and WebSocket Server Configuration
 * 
 * This file contains all the HTTP API routes and WebSocket server setup for the 
 * WatchMatchMaker application. The app helps groups of users vote on movies/TV shows
 * to find what to watch together.
 * 
 * Key Features:
 * - User authentication and profile management
 * - Room creation and management for voting sessions
 * - Real-time communication via WebSockets
 * - Integration with TMDB (The Movie Database) API
 * - Voting system with live updates
 * - Results calculation and broadcasting
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPublicUserSchema, insertRoomSchema, insertVoteSchema, type Room } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

// =============================================================================
// EXTERNAL API CONFIGURATION
// =============================================================================

/**
 * TMDB (The Movie Database) API Configuration
 * TMDB provides movie and TV show data including titles, posters, descriptions, etc.
 * 
 * Required environment variables:
 * - TMDB_API_KEY: Your TMDB API key
 * - TMDB_ACCESS_TOKEN: Your TMDB access token (preferred for newer API endpoints)
 */
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

/** Headers required for TMDB API requests */
const tmdbHeaders = {
  'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

// =============================================================================
// WEBSOCKET CONNECTION MANAGEMENT
// =============================================================================

/**
 * WebSocket connections map - tracks active connections per room
 * Structure: Map<roomCode, Set<WebSocket>>
 * 
 * This allows us to:
 * - Send real-time updates to all users in a specific room
 * - Clean up connections when users leave
 * - Broadcast voting updates, user joins/leaves, etc.
 */
const wsConnections = new Map<string, Set<WebSocket>>();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a unique 8-character room code for new voting sessions
 * 
 * The room code is what users share to join the same voting session.
 * We ensure uniqueness by checking against existing rooms in the database.
 * 
 * @returns Promise<string> - A unique 8-character alphanumeric room code
 * @throws Error if unable to generate unique code after max attempts
 */
async function generateRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  let attempts = 0;
  const MAX_ATTEMPTS = 10; // Prevent infinite loop in case of unforeseen issues

  while (attempts < MAX_ATTEMPTS) {
    result = '';
    // Generate 8 random characters
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    try {
      // Check if this code already exists in the database
      const existingRoom = await storage.getRoomByCode(result);
      if (!existingRoom) {
        return result; // Unique code found
      }
    } catch (error) {
      console.error('Failed to check existing room codes, using generated code anyway:', error);
      // If we can't check for existing rooms, just return the generated code
      // This is a fallback to keep the app working even if there are DB issues
      return result;
    }
    
    attempts++;
  }
  throw new Error('Failed to generate a unique room code after multiple attempts.');
}

/**
 * Broadcasts a message to all WebSocket connections in a specific room
 * 
 * This is how we send real-time updates to all users in a voting session:
 * - When someone joins the room
 * - When someone casts a vote
 * - When voting completes
 * - When results are ready
 * 
 * @param roomCode - The room code to broadcast to
 * @param message - The message object to send (will be JSON stringified)
 */
function broadcastToRoom(roomCode: string, message: any) {
  const connections = wsConnections.get(roomCode);
  if (connections) {
    connections.forEach((ws) => {
      // Only send to open connections (user hasn't closed browser/tab)
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

/**
 * Creates a Supabase client with appropriate authentication context
 * 
 * This function handles two scenarios:
 * 1. User is authenticated: Use their JWT token for row-level security
 * 2. No auth/system operations: Use service role key with full access
 * 
 * @param req - Express request object containing authorization headers
 * @returns Configured Supabase client
 */
const getSupabaseClient = (req: Request) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Extract JWT from "Bearer <token>"
  const supabaseUrl = process.env.SUPABASE_URL || 'https://qouppyvbepiccepacxne.supabase.co';

  if (token) {
    console.log('[getSupabaseClient] Using user JWT for Supabase client');
    return createClient(supabaseUrl, token, {
      auth: { persistSession: false } // Don't persist sessions on server
    });
  }
  // Fallback to service role key for system operations
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  console.log('[getSupabaseClient] Using service role key for Supabase client:', !!supabaseKey);
  return createClient(supabaseUrl, supabaseKey);
};

// =============================================================================
// MAIN SERVER SETUP AND WEBSOCKET CONFIGURATION
// =============================================================================

/**
 * Registers all API routes and sets up the WebSocket server
 * 
 * This is the main entry point that:
 * 1. Creates HTTP server from Express app
 * 2. Sets up WebSocket server for real-time communication
 * 3. Registers all API endpoints
 * 4. Returns the configured HTTP server
 * 
 * @param app - Express application instance
 * @returns HTTP Server instance with WebSocket support
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server that can handle both regular HTTP and WebSocket upgrades
  const httpServer = createServer(app);
  
  // =============================================================================
  // WEBSOCKET SERVER SETUP
  // =============================================================================
  
  /**
   * WebSocket server for real-time communication
   * Path: /ws - clients connect to ws://localhost:port/ws
   */
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  /**
   * Handle new WebSocket connections
   * Each user's browser will establish one WebSocket connection
   */
  wss.on('connection', (ws, req) => {
    let currentRoomCode: string | null = null; // Track which room this connection belongs to
    
    /**
     * Handle incoming messages from the client
     * Message format: JSON with 'type' field indicating message purpose
     */
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        /**
         * Handle room join requests
         * When a user enters a room code and joins a voting session
         */
        if (message.type === 'join-room') {
          currentRoomCode = message.roomCode;
          if (currentRoomCode) {
            // Add this connection to the room's connection set
            if (!wsConnections.has(currentRoomCode)) {
              wsConnections.set(currentRoomCode, new Set());
            }
            wsConnections.get(currentRoomCode)!.add(ws);
            
            // Notify all other users in the room that someone joined
            broadcastToRoom(currentRoomCode, {
              type: 'user-joined',
              userId: message.userId
            });
          }
        }
        
        /**
         * Handle vote cast events
         * When a user votes on a movie, broadcast to other room members
         */
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
    
    /**
     * Handle connection close (user closes browser, navigates away, etc.)
     * Clean up the connection from our tracking maps
     */
    ws.on('close', () => {
      if (currentRoomCode) {
        const connections = wsConnections.get(currentRoomCode);
        if (connections) {
          connections.delete(ws);
          // If no one left in the room, remove the room from our map
          if (connections.size === 0) {
            wsConnections.delete(currentRoomCode);
          }
        }
      }
    });
  });

  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================

  /**
   * POST /api/auth/signup
   * 
   * Creates a new user account in our system after Supabase authentication
   * 
   * Flow:
   * 1. User signs up with Supabase (handled by frontend)
   * 2. Frontend calls this endpoint with Supabase user ID
   * 3. We create a corresponding user record in our database
   * 
   * Body: { supabase_id, ...other user data }
   * Response: Created user object
   */
  app.post('/api/auth/signup', async (req, res) => {
    try {
      // Map camelCase to snake_case for supabase_id (API convention difference)
      const { supabase_id, ...rest } = req.body;
      
      if (!supabase_id) {
        return res.status(400).json({ error: 'supabase_id is required' });
      }
      
      // Validate user data against our schema
      const userData = insertPublicUserSchema.parse({
        supabaseId: supabase_id,
        ...rest
      });
      
      // Check if user already exists (prevent duplicates)
      const existingUser = await storage.getUserBySupabaseId(userData.supabaseId as string);
      if (existingUser) {
        return res.json(existingUser); // Return existing user
      }
      
      // Create new user in our database
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error('Signup validation error:', error);
      res.status(400).json({ error: 'Invalid user data', details: error });
    }
  });

  /**
   * GET /api/auth/user/:id
   * 
   * Fetches user profile by ID, creates one if it doesn't exist
   * Used when user logs in to get their profile data
   * 
   * Parameters: id - User's Supabase ID
   * Response: User profile object
   */
  app.get('/api/auth/user/:id', async (req, res) => {
    try {
      console.log(`[AUTH ROUTE] Fetching profile for id: ${req.params.id}`);
      let profile = await storage.getProfileById(req.params.id);
      console.log(`[AUTH ROUTE] getProfileById result:`, profile);
      
      // If profile doesn't exist, create a new one
      if (!profile) {
        try {
          console.log(`[AUTH ROUTE] Profile not found, creating new profile for id: ${req.params.id}`);
          profile = await storage.createProfile({
            id: req.params.id,
            email: '', // Could fetch from Supabase Auth if needed
          });
          console.log(`[AUTH ROUTE] Created new profile:`, profile);
        } catch (createErr) {
          console.error(`[AUTH ROUTE] Error creating profile:`, createErr);
          return res.status(500).json({ 
            error: 'Failed to create profile', 
            details: createErr instanceof Error ? createErr.message : createErr 
          });
        }
      }
      res.json(profile);
    } catch (error) {
      console.error(`[AUTH ROUTE] Unexpected error:`, error);
      res.status(500).json({ 
        error: 'Server error', 
        details: error instanceof Error ? error.message : error 
      });
    }
  });

  /**
   * PUT /api/auth/user/:id/preferences
   * 
   * Updates user's viewing preferences (genres, streaming services, etc.)
   * Used in onboarding flow and settings page
   * 
   * Body: { preferences: {...} }
   * Response: Updated user object
   */
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

  /**
   * GET /api/auth/user/:supabase_id/rated-content
   * 
   * Fetches all content (movies/shows) that a user has previously rated
   * Used to show user's rating history and avoid re-rating content
   * 
   * Parameters: supabase_id - User's Supabase ID
   * Response: { ratedItems: [...] }
   */
  app.get('/api/auth/user/:supabase_id/rated-content', async (req, res) => {
    try {
      const { supabase_id } = req.params;
      console.log(`GET /api/auth/user/${supabase_id}/rated-content endpoint hit`);
      const ratedItems = await storage.getUserRatedContent(supabase_id);
      res.json({ ratedItems }); // Consistent object structure
    } catch (error) {
      console.error('Failed to fetch user rated content:', error);
      res.status(500).json({ error: 'Server error fetching rated content' });
    }
  });

  // =============================================================================
  // TMDB (THE MOVIE DATABASE) API ROUTES
  // =============================================================================

  /**
   * GET /api/tmdb/genres/:type
   * 
   * Fetches available genres for movies or TV shows from TMDB
   * Used in preference selection and filtering
   * 
   * Parameters: type - 'movie' or 'tv'
   * Response: Array of genre objects [{ id, name }, ...]
   */
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

  /**
   * GET /api/tmdb/discover/:type
   * 
   * Discovers movies or TV shows based on filters (genres, popularity, etc.)
   * Used to get content recommendations for voting sessions
   * 
   * Parameters: type - 'movie' or 'tv'
   * Query params: genres (comma-separated genre IDs), page (pagination)
   * Response: Array of movie/TV show objects
   */
  app.get('/api/tmdb/discover/:type', async (req, res) => {
    try {
      const type = req.params.type; // 'movie' or 'tv'
      const { genres, page = 1 } = req.query;
      
      // Build TMDB API URL with filters
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

  /**
   * GET /api/tmdb/recommendations/:type/:id
   * 
   * Gets TMDB's recommended content based on a specific movie/show
   * Used to suggest similar content for voting
   * 
   * Parameters: type - 'movie' or 'tv', id - TMDB content ID
   * Query params: page (pagination)
   * Response: Array of recommended movie/TV show objects
   */
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

  // =============================================================================
  // ROOM MANAGEMENT ROUTES
  // =============================================================================

  /**
   * POST /api/rooms
   * 
   * Creates a new voting room/session
   * 
   * Flow:
   * 1. Generate unique room code
   * 2. Create room record in database
   * 3. Return room details to host
   * 
   * Body: { hostId } - Integer ID of the user creating the room
   * Response: Created room object with room code
   */
  app.post('/api/rooms', async (req, res) => {
    try {
      console.log('[POST /api/rooms] Request body:', JSON.stringify(req.body, null, 2));
      
      const { hostId } = req.body; // Should be integer ID from public.users table
      
      console.log('[POST /api/rooms] Extracted hostId:', hostId, 'Type:', typeof hostId);
      
      if (!hostId) {
        console.log('[POST /api/rooms] Missing hostId in request');
        return res.status(400).json({ error: 'Host ID required' });
      }
      
      // Generate unique 8-character room code
      const code = await generateRoomCode();
      console.log('[POST /api/rooms] Generated room code:', code);

      const roomData = {
        code,
        hostId, // Integer ID from public.users table
        status: 'waiting' // Room starts in waiting state
      };
      
      console.log('[POST /api/rooms] Room data before schema parse:', JSON.stringify(roomData, null, 2));
      
      // Validate against our schema
      const parsedRoomData = insertRoomSchema.parse(roomData);
      console.log('[POST /api/rooms] Room data after schema parse:', JSON.stringify(parsedRoomData, null, 2));
      
      console.log('[POST /api/rooms] Calling storage.createRoom...');
      const room = await storage.createRoom(parsedRoomData);
      console.log('[POST /api/rooms] Room created successfully:', JSON.stringify(room, null, 2));
      
      res.status(201).json(room); // 201 Created
    } catch (error) {
      console.error('[POST /api/rooms] Error creating room:', error);
      
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error('[POST /api/rooms] Error message:', error.message);
        console.error('[POST /api/rooms] Error stack:', error.stack);
      }
      
      // Handle specific error cases
      if (error instanceof Error && error.message.includes('unique room code')) {
        return res.status(500).json({ 
          error: 'Internal server error: Could not generate unique room code.' 
        });
      }
      res.status(400).json({ 
        error: 'Failed to create room', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * GET /api/rooms/:code
   * 
   * Fetches room details by room code
   * Used when users join a room or need to check room status
   * 
   * Parameters: code - 8-character room code
   * Response: Room object with participants list
   */
  app.get('/api/rooms/:code', async (req, res) => {
    try {
      const room = await storage.getRoomByCode(req.params.code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Get all participants in this room
      const participants = await storage.getRoomParticipants(room.id);
      res.json({ ...room, participants }); // Include participants in response
    } catch (error) {
      console.error('Failed to get room:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * POST /api/rooms/:code/join
   * 
   * Adds a user to an existing room as a participant
   * 
   * Flow:
   * 1. Validate room exists
   * 2. Check if user already in room
   * 3. Add user as participant
   * 4. Broadcast join event to other users
   * 
   * Parameters: code - Room code to join
   * Body: { userId } - Integer ID of user joining
   * Response: Participant object
   */
  app.post('/api/rooms/:code/join', async (req, res) => {
    try {
      const { code } = req.params;
      const { userId } = req.body; // Integer ID from public.users table

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to join a room' });
      }

      // Verify room exists
      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Check if user already in room (prevent duplicates)
      const existingParticipant = await storage.getParticipantByRoomAndUser(room.id, userId);
      if (existingParticipant) {
        return res.status(200).json(existingParticipant); // Return existing participant
      }

      // Add user to room
      const participant = await storage.addParticipant({ roomId: room.id, userId: userId });
      
      // Notify other users in real-time that someone joined
      broadcastToRoom(code, {
        type: 'user-joined',
        userId: userId,
        participantId: participant.id
      });
      
      res.status(201).json(participant); // 201 Created for new participant
    } catch (error) {
      console.error('Failed to join room:', error);
      res.status(400).json({ 
        error: 'Failed to join room', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * PUT /api/rooms/:code/content-type
   * 
   * Sets the content type for a room and starts the voting phase
   * 
   * Flow:
   * 1. Update room with selected content type (movie/TV)
   * 2. Fetch recommendations from TMDB
   * 3. Save recommendations to room
   * 4. Change room status to 'voting'
   * 5. Broadcast voting start to all participants
   * 
   * Parameters: code - Room code
   * Body: { contentType } - 'movie' or 'tv'
   * Response: Updated room object
   */
  app.put('/api/rooms/:code/content-type', async (req, res) => {
    try {
      const { contentType } = req.body;
      const room = await storage.getRoomByCode(req.params.code);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Fetch popular content from TMDB for voting
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/${contentType}?language=en-US&page=1&sort_by=popularity.desc`,
        { headers: tmdbHeaders }
      );
      
      if (!response.ok) {
        throw new Error('TMDB API error');
      }
      
      const data = await response.json();
      const recommendations = data.results.slice(0, 10); // Take first 10 for voting
      
      // Update room with recommendations and change status
      const updatedRoom = await storage.updateRoomRecommendations(room.id, recommendations);
      await storage.updateRoomStatus(room.id, 'voting');
      
      const finalRoom = { ...updatedRoom, contentType, status: 'voting' as const };
      
      // Notify all room participants that voting has started
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

  // =============================================================================
  // VOTING SYSTEM ROUTES
  // =============================================================================

  /**
   * POST /api/votes
   * 
   * Records a user's vote for a specific movie/show
   * 
   * Flow:
   * 1. Save vote to database
   * 2. Check if all participants have voted on all content
   * 3. If voting complete, calculate results and broadcast
   * 4. Otherwise, broadcast vote update to other participants
   * 
   * Body: { userId, movieId, score, roomCode }
   * Response: Created vote object
   */
  app.post('/api/votes', async (req, res) => {
    try {
      // Validate and save the vote
      const voteData = insertVoteSchema.parse(req.body);
      const vote = await storage.createVote(voteData);
      
      // Check if voting is complete for this room
      const roomCode = req.body.roomCode || '';
      let room: Room | undefined;
      if (roomCode) {
        room = await storage.getRoomByCode(roomCode); 
      }

      if (room) {
        const participants = await storage.getRoomParticipants(room.id);
        const allVotes = await storage.getRoomVotes(room.id);
        const recommendations = Array.isArray(room.recommendations) ? room.recommendations : [];
        
        // Check if everyone has voted on everything
        if (Array.isArray(participants) && participants.length > 0 && recommendations.length > 0) {
          const expectedVotes = participants.length * recommendations.length;
          
          if (allVotes.length >= expectedVotes) {
            // All votes are in - calculate and broadcast results
            const results = calculateResults(allVotes, recommendations);
            await storage.updateRoomResults(room.id, results);
            await storage.updateRoomStatus(room.id, 'completed');
            
            // Notify all participants that voting is complete
            broadcastToRoom(room.code, {
              type: 'voting-completed',
              results
            });
          }
        }
        
        // Broadcast individual vote update to other participants
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
      res.status(400).json({ 
        error: 'Failed to create vote', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * GET /api/rooms/:code/votes
   * 
   * Fetches all votes for a specific room
   * Used to show voting progress and final results
   * 
   * Parameters: code - Room code
   * Response: Array of vote objects
   */
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
      res.status(500).json({ 
        error: 'Server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * GET /api/rooms/:code/results
   * 
   * Fetches calculated results for a completed voting session
   * 
   * Parameters: code - Room code
   * Response: Results object with ranked movies/shows
   */
  app.get('/api/rooms/:code/results', async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Check if results are available
      if (room.status !== 'completed' || !room.results) {
        return res.status(200).json(
          room.results || { message: "Results not yet available or room not completed." }
        );
      }
      res.json(room.results);
    } catch (error) {
      console.error('Failed to get room results:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // =============================================================================
  // USER DATA AND SETTINGS ROUTES
  // =============================================================================

  /**
   * GET /api/profiles/:id/sessions
   * 
   * Fetches a user's voting session history
   * Shows past rooms they've participated in
   * 
   * Parameters: id - User ID
   * Response: Array of session objects
   */
  app.get('/api/profiles/:id/sessions', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /**
   * GET /api/streaming-services
   * 
   * Fetches available streaming services for user preferences
   * Uses authenticated Supabase client for row-level security
   * 
   * Headers: Authorization: Bearer <user-jwt>
   * Response: Array of streaming service objects
   */
  app.get('/api/streaming-services', async (req, res) => {
    try {
      console.log('GET /api/streaming-services endpoint hit');
      console.log('Authorization header:', req.headers['authorization']);
      
      // Get Supabase client with user's authentication context
      const authenticatedSupabase = getSupabaseClient(req);
      
      // Log which authentication method is being used
      if (req.headers['authorization']) {
        console.log('[streaming-services] Using user JWT for Supabase client');
      } else {
        console.log('[streaming-services] Using service role key for Supabase client:', 
                   !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      }
      
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

  // =============================================================================
  // TESTING AND DEBUG ROUTES
  // =============================================================================

  /**
   * GET /api/test/rooms-table
   * 
   * Test endpoint to verify database table access
   * Used for debugging database connection issues
   * 
   * Response: Success status and any error details
   */
  app.get('/api/test/rooms-table', async (req, res) => {
    try {
      console.log('Testing rooms table existence...');
      const { data, error, count } = await storage.testRoomsTableAccess();
      console.log('Rooms table test result:', { data, error, count });
      res.json({ 
        success: !error, 
        data, 
        error: error ? { 
          code: error.code, 
          message: error.message, 
          details: error.details 
        } : null,
        count 
      });
    } catch (err) {
      console.error('Rooms table test failed:', err);
      res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  });

  return httpServer;
}

// =============================================================================
// VOTING RESULTS CALCULATION
// =============================================================================

/**
 * Calculates voting results by aggregating scores for each movie/show
 * 
 * The algorithm:
 * 1. Initialize score tracking for each recommended movie/show
 * 2. Sum up all votes for each movie (higher scores = more liked)
 * 3. Sort by total score (highest first)
 * 4. Format results with movie details and voting breakdown
 * 
 * @param votes - Array of vote objects from database
 * @param recommendations - Array of movie/show objects from TMDB
 * @returns Sorted array of results with scores and voting details
 */
function calculateResults(votes: any[], recommendations: any[]) {
  // Map to track scores: movieId -> { movie data, total score, individual votes }
  const movieScores = new Map<number, { 
    movie: any; 
    totalScore: number; 
    votes: { userId: number; score: number }[] 
  }>();
  
  // Initialize score tracking for each recommended movie/show
  recommendations.forEach(movie => {
    movieScores.set(movie.id, {
      movie,
      totalScore: 0,
      votes: []
    });
  });
  
  // Aggregate all votes by movie
  votes.forEach(vote => {
    const movieScore = movieScores.get(vote.movieId);
    if (movieScore) {
      movieScore.totalScore += vote.score; // Add to running total
      movieScore.votes.push({
        userId: vote.userId,
        score: vote.score
      });
    }
  });
  
  // Convert to array, sort by total score (highest first), and format for frontend
  return Array.from(movieScores.values())
    .sort((a, b) => b.totalScore - a.totalScore) // Highest score first
    .map(({ movie, totalScore, votes }) => ({
      movieId: movie.id,
      title: movie.title || movie.name, // Movies have 'title', TV shows have 'name'
      poster: movie.poster_path,
      overview: movie.overview,
      releaseDate: movie.release_date || movie.first_air_date,
      voteAverage: movie.vote_average, // TMDB's own rating
      totalScore, // Our calculated score from user votes
      votes // Individual vote breakdown
    }));
}
