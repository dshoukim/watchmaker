import { users, rooms, roomParticipants, votes, userSessions, type User, type InsertUser, type Room, type InsertRoom, type RoomParticipant, type InsertRoomParticipant, type Vote, type InsertVote, type UserSession, type InsertUserSession } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(id: number, preferences: any): Promise<User | undefined>;

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
  createVote(vote: InsertVote): Promise<Vote>;
  getUserVotesForRoom(roomId: number, userId: number): Promise<Vote[]>;
  getRoomVotes(roomId: number): Promise<Vote[]>;

  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSessions(userId: number): Promise<UserSession[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<number, Room>;
  private roomParticipants: Map<number, RoomParticipant>;
  private votes: Map<number, Vote>;
  private userSessions: Map<number, UserSession>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.roomParticipants = new Map();
    this.votes = new Map();
    this.userSessions = new Map();
    this.currentId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.supabaseId === supabaseId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPreferences(id: number, preferences: any): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, preferences };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Rooms
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.currentId++;
    const room: Room = { 
      ...insertRoom, 
      id, 
      createdAt: new Date() 
    };
    this.rooms.set(id, room);
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(room => room.code === code);
  }

  async updateRoomStatus(id: number, status: "waiting" | "voting" | "completed"): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, status };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async updateRoomRecommendations(id: number, recommendations: any[]): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, recommendations };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async updateRoomResults(id: number, results: any[]): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, results };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  // Room Participants
  async addParticipant(insertParticipant: InsertRoomParticipant): Promise<RoomParticipant> {
    const id = this.currentId++;
    const participant: RoomParticipant = { 
      ...insertParticipant, 
      id, 
      joinedAt: new Date() 
    };
    this.roomParticipants.set(id, participant);
    return participant;
  }

  async getRoomParticipants(roomId: number): Promise<RoomParticipant[]> {
    return Array.from(this.roomParticipants.values()).filter(p => p.roomId === roomId);
  }

  async getParticipantByRoomAndUser(roomId: number, userId: number): Promise<RoomParticipant | undefined> {
    return Array.from(this.roomParticipants.values()).find(p => p.roomId === roomId && p.userId === userId);
  }

  // Votes
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentId++;
    const vote: Vote = { 
      ...insertVote, 
      id, 
      createdAt: new Date() 
    };
    this.votes.set(id, vote);
    return vote;
  }

  async getUserVotesForRoom(roomId: number, userId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(v => v.roomId === roomId && v.userId === userId);
  }

  async getRoomVotes(roomId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(v => v.roomId === roomId);
  }

  // User Sessions
  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const id = this.currentId++;
    const session: UserSession = { 
      ...insertSession, 
      id, 
      completedAt: new Date() 
    };
    this.userSessions.set(id, session);
    return session;
  }

  async getUserSessions(userId: number): Promise<UserSession[]> {
    return Array.from(this.userSessions.values()).filter(s => s.userId === userId);
  }
}

export const storage = new MemStorage();
