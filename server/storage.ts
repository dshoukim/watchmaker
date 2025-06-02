import { rooms, roomParticipants, votes, userSessions, type Room, type InsertRoom, type RoomParticipant, type InsertRoomParticipant, type Vote, type InsertVote, type UserSession, type InsertUserSession, type StreamingService, type InsertStreamingService, content, ratedContent, profiles } from "@shared/schema";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabaseUrl = process.env.SUPABASE_URL || 'https://qouppyvbepiccepacxne.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface IStorage {
  // Users
  getUser(id: number): Promise<any | undefined>;
  getUserBySupabaseId(supabase_id: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  updateUserPreferences(id: number, preferences: any): Promise<any | undefined>;
  getUserRatedContent(supabaseUserId: string): Promise<any[]>;

  // Rooms
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoomStatus(id: number, status: "waiting" | "voting" | "completed"): Promise<Room | undefined>;
  updateRoomRecommendations(id: number, recommendations: any[]): Promise<Room | undefined>;
  updateRoomResults(id: number, results: any[]): Promise<Room | undefined>;
  testRoomsTableAccess(): Promise<{ data: any; error: any; count: number | null }>;

  // Room Participants
  addParticipant(participant: InsertRoomParticipant): Promise<RoomParticipant>;
  getRoomParticipants(roomId: number): Promise<RoomParticipant[]>;
  getParticipantByRoomAndUser(roomId: number, userId: number): Promise<RoomParticipant | undefined>;

  // Votes
  createVote(vote: InsertVote): Promise<Vote | undefined>;
  getUserVotesForRoom(roomId: number, userId: number): Promise<Vote[]>;
  getRoomVotes(roomId: number): Promise<Vote[]>;

  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessions(userId: number): Promise<UserSession[]>;

  getAllStreamingServices(supabaseClient: SupabaseClient): Promise<StreamingService[]>;

  getProfileById(id: string): Promise<any | undefined>;
  createProfile(profile: any): Promise<any>;
}

export class SupabaseStorage implements IStorage {
  async createUser(user: any) {
    console.log('Supabase: createUser', user);
    // Map supabase_id to supabase_id (snake_case)
    const { supabase_id, ...rest } = user;
    const userToInsert = { supabase_id, ...rest };
    const { data, error } = await supabase.from('users').insert([userToInsert]).select().single();
    if (error) throw error;
    return data;
  }
  async getUserBySupabaseId(supabase_id: string) {
    console.log('Supabase: getUserBySupabaseId', supabase_id);
    const { data, error } = await supabase.from('users').select('*').eq('supabase_id', supabase_id).single();
    if (error) return undefined;
    return data;
  }
  async updateUserPreferences(id: number, preferences: any) {
    console.log('Supabase: updateUserPreferences', { id, preferences });

    // 1. Fetch existing user data (which includes preferences)
    const { data: existingUserData, error: fetchError } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching existing user preferences:', fetchError);
      throw fetchError;
    }

    // 2. Merge existing preferences with new preferences
    // Ensure existingUserData and existingUserData.preferences are not null
    const existingPreferences = existingUserData?.preferences || {};
    const mergedPreferences = { ...existingPreferences, ...preferences };

    console.log('Supabase: Merged preferences for update', mergedPreferences);

    // 3. Update with merged preferences
    const { data, error } = await supabase
      .from('users')
      .update({ preferences: mergedPreferences })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences with merged data:', error);
      throw error;
    }
    return data;
  }
  async createVote(vote: InsertVote): Promise<Vote | undefined> {
    console.log('Supabase: createVote', vote);
    const { data, error } = await supabase.from('votes').insert([vote]).select().single();
    if (error) {
        console.error("Error creating vote:", error);
        return undefined;
    }
    return data as Vote;
  }
  async getUser(id: number): Promise<any | undefined> {
    console.log('Supabase: getUser', id);
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) {
      console.error('Error fetching user by id:', error);
      return undefined;
    }
    return data;
  }
  async createRoom(room: InsertRoom): Promise<Room> {
    console.log('Supabase: createRoom', room);
    
    // Map camelCase field names to snake_case database column names
    const roomForDatabase = {
      code: room.code,
      host_id: room.hostId, // Map hostId to host_id
      content_type: room.contentType,
      status: room.status,
      recommendations: room.recommendations,
      results: room.results
    };
    
    console.log('Supabase: createRoom - mapped data for database:', roomForDatabase);
    
    const { data, error } = await supabase.from('rooms').insert([roomForDatabase]).select().single();
    if (error) {
      console.error('Error creating room:', error);
      throw error;
    }
    
    // Map the response back to camelCase for our application
    const mappedData = {
      ...data,
      hostId: data.host_id, // Map host_id back to hostId
      contentType: data.content_type,
      createdAt: data.created_at
    };
    
    return mappedData as Room;
  }
  async getRoomByCode(code: string): Promise<Room | undefined> {
    console.log('Supabase: getRoomByCode', code);
    try {
      const { data, error } = await supabase.from('rooms').select('*').eq('code', code).single();
      
      if (error) {
        console.log('Supabase getRoomByCode error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === 'PGRST116') {
          // No rows found - this is expected when checking for unique room codes
          console.log('Room code', code, 'is available (no existing room found)');
          return undefined;
        }
        
        // For any other error, log details and throw
        console.error('Error fetching room by code:', error);
        throw error;
      }
      
      console.log('Found existing room with code:', code, data);
      
      // Map the response back to camelCase for our application
      const mappedData = {
        ...data,
        hostId: data.host_id, // Map host_id back to hostId
        contentType: data.content_type,
        createdAt: data.created_at
      };
      
      return mappedData as Room;
    } catch (err) {
      console.error('Caught exception in getRoomByCode:', err);
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      throw err;
    }
  }
  async updateRoomStatus(id: number, status: "waiting" | "voting" | "completed"): Promise<Room | undefined> {
    console.log('Supabase: updateRoomStatus', { id, status });
    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating room status:', error);
      // PGRST116: "Fetched single row, but no rows found"
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data as Room;
  }
  async updateRoomRecommendations(id: number, recommendations: any[]): Promise<Room | undefined> {
    console.log('Supabase: updateRoomRecommendations', { id, recommendations });
    const { data, error } = await supabase
      .from('rooms')
      .update({ recommendations: recommendations })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating room recommendations:', error);
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data as Room;
  }
  async updateRoomResults(id: number, results: any[]): Promise<Room | undefined> {
    console.log('Supabase: updateRoomResults', { id, results });
    const { data, error } = await supabase
      .from('rooms')
      .update({ results: results })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating room results:', error);
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data as Room;
  }
  async addParticipant(participant: InsertRoomParticipant): Promise<RoomParticipant> {
    console.log('Supabase: addParticipant', participant);
    
    // Map camelCase field names to snake_case database column names
    const participantForDatabase = {
      room_id: participant.roomId, // Map roomId to room_id
      user_id: participant.userId  // Map userId to user_id
    };
    
    console.log('Supabase: addParticipant - mapped data for database:', participantForDatabase);
    
    const { data, error } = await supabase
      .from('room_participants')
      .insert([participantForDatabase])
      .select()
      .single();
    if (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
    
    // Map the response back to camelCase for our application
    const mappedData = {
      ...data,
      roomId: data.room_id, // Map room_id back to roomId
      userId: data.user_id, // Map user_id back to userId
      joinedAt: data.joined_at
    };
    
    return mappedData as RoomParticipant;
  }
  async getRoomParticipants(roomId: number): Promise<RoomParticipant[]> {
    console.log('Supabase: getRoomParticipants', roomId);
    const { data, error } = await supabase
      .from('room_participants')
      .select('*') // Consider selecting specific columns or joining with users table if needed
      .eq('room_id', roomId);
    if (error) {
      console.error('Error fetching room participants:', error);
      throw error;
    }
    return data as RoomParticipant[];
  }
  async getParticipantByRoomAndUser(roomId: number, userId: number): Promise<RoomParticipant | undefined> {
    console.log('Supabase: getParticipantByRoomAndUser', { roomId, userId });
    const { data, error } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId) // Ensure this userId is the integer ID from public.users
      .maybeSingle(); // Use maybeSingle() as a participant might not exist

    if (error) {
      console.error('Error fetching participant by room and user:', error);
      // PGRST116 means no rows found, which is acceptable for maybeSingle, so don't throw
      if (error.code !== 'PGRST116') {
         throw error;
      }
    }
    return data as RoomParticipant | undefined;
  }
  async getUserVotesForRoom(roomId: number, userId: number): Promise<Vote[]> {
    console.log('Supabase: getUserVotesForRoom', { roomId, userId });
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching user votes for room:', error);
      throw error;
    }
    return data as Vote[];
  }
  async getRoomVotes(roomId: number): Promise<Vote[]> {
    console.log('Supabase: getRoomVotes', roomId);
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId);
    if (error) {
      console.error('Error fetching room votes:', error);
      throw error;
    }
    return data as Vote[];
  }
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    console.log('Supabase: createUserSession', session);
    const { data, error } = await supabase.from('user_sessions').insert([session]).select().single();
    if (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
    return data as UserSession;
  }
  async getUserSessions(userId: number): Promise<UserSession[]> {
    console.log('Supabase: getUserSessions', userId);
    const { data, error } = await supabase.from('user_sessions').select('*').eq('user_id', userId);
    if (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
    return data as UserSession[];
  }
  async getAllStreamingServices(supabaseClient: SupabaseClient): Promise<StreamingService[]> {
    console.log('Supabase: getAllStreamingServices');
    const { data, error } = await supabaseClient.from('streaming_services').select('*');
    if (error) {
      console.error('Error fetching streaming services:', error);
      throw error;
    }
    return data as StreamingService[];
  }
  async getUserRatedContent(supabaseUserId: string): Promise<any[]> {
    console.log('Supabase: getUserRatedContent for supabaseUserId:', supabaseUserId);

    interface RatedContentItemFromSupabase {
      rating: number;
      rated_at: string;
      content: Array<{
        id: number;
        tmdbId: number;
        type: 'movie' | 'tv';
        title: string;
        overview: string | null;
        posterPath: string | null;
        releaseDate: string | null;
      }> | null;
    }

    const { data, error } = await supabase
      .from('rated_content')
      .select(`
        rating,
        rated_at,
        content:content_id (
          id,
          tmdbId,
          type,
          title,
          overview,
          posterPath,
          releaseDate
        )
      `)
      .eq('user_id', supabaseUserId);

    if (error) {
      console.error('Error fetching user rated content:', error);
      throw error;
    }
    // Transform data to match client expectation (RatedContent type)
    // Ensure item.content is not null before accessing its properties
    return (data as RatedContentItemFromSupabase[]).map(item => ({
      id: item.content && item.content.length > 0 ? item.content[0].id : null,
      title: item.content && item.content.length > 0 ? item.content[0].title : 'Unknown',
      type: item.content && item.content.length > 0 ? item.content[0].type : 'movie',
      posterPath: item.content && item.content.length > 0 ? item.content[0].posterPath : null,
      rating: item.rating,
      ratedAt: item.rated_at
    }));
  }
  async testRoomsTableAccess(): Promise<{ data: any; error: any; count: number | null }> {
    console.log('Supabase: testRoomsTableAccess - checking if rooms table exists and is accessible');
    try {
      // Try a simple count query first
      const { data, error, count } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true }); // head: true means don't return data, just count
      
      console.log('Rooms table count query result:', { data, error, count });
      return { data, error, count };
    } catch (err) {
      console.error('Exception during rooms table test:', err);
      return { 
        data: null, 
        error: err instanceof Error ? { message: err.message, stack: err.stack } : err, 
        count: null 
      };
    }
  }
  async getProfileById(id: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) return undefined;
    return data;
  }
  async createProfile(profile: any) {
    const { id, ...rest } = profile;
    const { data, error } = await supabase.from('profiles').insert([{ id, ...rest }]).select().single();
    if (error) throw error;
    return data;
  }
}

export const storage = new SupabaseStorage();
