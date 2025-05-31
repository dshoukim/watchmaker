import { rooms, roomParticipants, votes, userSessions, type Room, type InsertRoom, type RoomParticipant, type InsertRoomParticipant, type Vote, type InsertVote, type UserSession, type InsertUserSession, type StreamingService, type InsertStreamingService } from "@shared/schema";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface IStorage {
  // Users
  getUser(id: number): Promise<any | undefined>;
  getUserBySupabaseId(supabase_id: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  updateUserPreferences(id: number, preferences: any): Promise<any | undefined>;

  // Rooms
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoomStatus(id: number, status: "waiting" | "voting" | "completed"): Promise<Room | undefined>;
  updateRoomRecommendations(id: number, recommendations: any[]): Promise<Room | undefined>;
  updateRoomResults(id: number, results: any[]): Promise<Room | undefined>;

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
    const { data, error } = await supabase.from('users').update({ preferences }).eq('id', id).select().single();
    if (error) throw error;
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
    const { data, error } = await supabase.from('rooms').insert([room]).select().single();
    if (error) {
      console.error('Error creating room:', error);
      throw error;
    }
    return data as Room;
  }
  async getRoomByCode(code: string): Promise<Room | undefined> {
    console.log('Supabase: getRoomByCode', code);
    const { data, error } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching room by code:', error);
      throw error;
    }
    return data as Room;
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
    // Ensure participant.userId is the integer ID from public.users
    // and participant.roomId is the integer ID from rooms
    const { data, error } = await supabase
      .from('room_participants')
      .insert([participant])
      .select()
      .single();
    if (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
    return data as RoomParticipant;
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
}

export const storage = new SupabaseStorage();
