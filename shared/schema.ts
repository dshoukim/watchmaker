import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: text("supabase_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  preferences: jsonb("preferences").$type<{
    genres: string[];
    favoriteMovies: number[];
    favoriteTVShows: number[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostId: integer("host_id").references(() => users.id).notNull(),
  contentType: text("content_type").$type<"movie" | "tv">(),
  status: text("status").$type<"waiting" | "voting" | "completed">().default("waiting").notNull(),
  recommendations: jsonb("recommendations").$type<any[]>(),
  results: jsonb("results").$type<{
    movieId: number;
    title: string;
    totalScore: number;
    votes: { userId: number; score: number }[];
  }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roomParticipants = pgTable("room_participants", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  movieId: integer("movie_id").notNull(),
  score: integer("score").notNull(), // -2, -1, 1, 2
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  selectedMovieId: integer("selected_movie_id"),
  selectedMovieTitle: text("selected_movie_title"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export const insertRoomParticipantSchema = createInsertSchema(roomParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  completedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type RoomParticipant = typeof roomParticipants.$inferSelect;
export type InsertRoomParticipant = z.infer<typeof insertRoomParticipantSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
