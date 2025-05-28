import { pgTable, foreignKey, unique, check, uuid, text, timestamp, integer, jsonb, pgPolicy, bigint, boolean, date, serial, primaryKey, pgSchema } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the 'auth' schema and the 'users' table within it.
// This is for referencing Supabase's auth.users table.
// schemaFilter in drizzle.config.ts should prevent Drizzle Kit from trying to manage/create this.
export const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey().notNull(),
  // Add other auth.users columns here if needed for type inference elsewhere in your app
  // email: text("email"),
  // created_at: timestamp("created_at"),
});

// Definitions from migrations/schema.ts (drizzle-kit pull output)
// These represent the existing state of your public schema tables.

export const publicUsers = pgTable("users", { // This is the public.users table from the pull
  id: serial("id").primaryKey().notNull(),
  supabaseId: text("supabase_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatar: text(),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique("users_supabase_id_unique").on(table.supabaseId),
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().notNull(), // This ID should be linked to authUsers.id
  username: text("username"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  streamingPlatforms: bigint("streaming_platforms", { mode: "number" }).array().default(sql`'{}'::bigint[]`),
  contentPreferences: jsonb("content_preferences").default({}),
  isProfileComplete: boolean("is_profile_complete").default(false),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: text("gender"),
  dateOfBirth: date("date_of_birth"),
  city: text("city"),
  profileCompleted: boolean("profile_completed").default(false),
  preferences: jsonb("preferences"), // Note: This 'preferences' might be redundant with contentPreferences or publicUsers.preferences
}, (table) => [
  foreignKey({ // Foreign key to auth.users
    columns: [table.id],
    foreignColumns: [authUsers.id],
    name: "profiles_id_fkey"
  }),
  pgPolicy("profiles_select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
  pgPolicy("profiles_update_policy", { as: "permissive", for: "update", to: ["public"] }),
]);

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey().notNull(),
  code: text("code").notNull(),
  hostId: integer("host_id").notNull(), // References publicUsers.id
  contentType: text("content_type"),
  status: text("status").default('waiting').notNull(),
  recommendations: jsonb("recommendations"),
  results: jsonb("results"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ // References publicUsers.id
    columns: [table.hostId],
    foreignColumns: [publicUsers.id],
    name: "rooms_host_id_users_id_fk"
  }),
  unique("rooms_code_unique").on(table.code),
]);

export const roomParticipants = pgTable("room_participants", {
  id: serial("id").primaryKey().notNull(),
  roomId: integer("room_id").notNull().references(() => rooms.id), // FK to rooms.id
  userId: integer("user_id").notNull().references(() => publicUsers.id), // FK to publicUsers.id
  joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    // Drizzle infers FKs from .references() for room_id and user_id
    // If specific FK names from migrations/schema.ts are needed and not auto-generated:
    // foreignKey({ columns: [table.roomId], foreignColumns: [rooms.id], name: "room_participants_room_id_rooms_id_fk" }),
    // foreignKey({ columns: [table.userId], foreignColumns: [publicUsers.id], name: "room_participants_user_id_users_id_fk" }),
]);

export const votes = pgTable("votes", {
  id: serial("id").primaryKey().notNull(),
  roomId: integer("room_id").notNull().references(() => rooms.id), // FK to rooms.id
  userId: integer("user_id").notNull().references(() => publicUsers.id), // FK to publicUsers.id
  movieId: integer("movie_id").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}); // FKs inferred

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id").notNull().references(() => publicUsers.id), // FK to publicUsers.id
  roomId: integer("room_id").notNull().references(() => rooms.id), // FK to rooms.id
  selectedMovieId: integer("selected_movie_id"),
  selectedMovieTitle: text("selected_movie_title"),
  completedAt: timestamp("completed_at", { mode: 'string' }).defaultNow().notNull(),
}); // FKs inferred

export const streamingServices = pgTable("streaming_services", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "streaming_services_id_seq", startWith: 1, increment: 1, minValue: 1, cache: 1 }), // Removed maxValue
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  name: text("name"), // Was unique in migrations/schema.ts, ensure consistency.
  logoUrl: text("logo_url"),
}, (table) => [
  unique("streaming_services_name_key").on(table.name), // Restoring unique constraint from pull
  pgPolicy("Enable read access for all users", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const watchPartyContent = pgTable("watch_party_content", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  watchPartyId: uuid("watch_party_id").notNull(), // Consider if this should FK to a "watch_parties" table if one exists/is planned
  tmdbId: text("tmdb_id").notNull(),
  contentType: text("content_type").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  addedBy: uuid("added_by").references(() => profiles.id), // FK to profiles.id
  totalScore: integer("total_score").default(0),
  likeCount: integer("like_count").default(0),
  dislikeCount: integer("dislike_count").default(0),
  superlikeCount: integer("superlike_count").default(0),
  metadata: jsonb("metadata").default({}),
}, (table) => [
  // foreignKey for addedBy is inferred by .references()
  unique("watch_party_content_watch_party_id_tmdb_id_key").on(table.watchPartyId, table.tmdbId),
  check("watch_party_content_content_type_check", sql`content_type = ANY (ARRAY['movie'::text, 'show'::text])`),
  // pgPolicy("content_select_policy", ...) // Add if this was in migrations/schema.ts and needed
]);

export const watchPartySwipes = pgTable("watch_party_swipes", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  watchPartyId: uuid("watch_party_id").notNull(), // Consider FK
  contentId: uuid("content_id").notNull().references(() => watchPartyContent.id, { onDelete: "cascade" }), // FK to watchPartyContent.id
  userId: uuid("user_id").notNull().references(() => profiles.id), // FK to profiles.id
  action: text("action").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  // FKs for contentId, userId inferred
  unique("watch_party_swipes_watch_party_id_content_id_user_id_key").on(table.watchPartyId, table.contentId, table.userId),
  pgPolicy("swipes_insert_policy", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = auth.uid())` }),
  check("watch_party_swipes_action_check", sql`action = ANY (ARRAY['right'::text, 'left'::text, 'up'::text, 'down'::text])`),
]);

export const contentRatings = pgTable("content_ratings", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  watchPartyId: uuid("watch_party_id"), // Consider FK
  contentId: uuid("content_id").references(() => watchPartyContent.id, { onDelete: "cascade" }), // FK to watchPartyContent.id
  userId: uuid("user_id").notNull().references(() => profiles.id), // FK to profiles.id
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  // FKs for contentId, userId inferred
  unique("content_ratings_watch_party_id_content_id_user_id_key").on(table.watchPartyId, table.contentId, table.userId),
  pgPolicy("ratings_insert_policy", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = auth.uid())` }),
  pgPolicy("ratings_update_policy", { as: "permissive", for: "update", to: ["public"] }),
  check("content_ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);


// --- New Application Tables ---

export const content = pgTable("content", {
  id: serial("id").primaryKey().notNull(),
  tmdbId: integer("tmdb_id").notNull(),
  type: text("type").$type<"movie" | "tv">().notNull(),
  title: text("title").notNull(),
  overview: text("overview"),
  posterPath: text("poster_path"),
  releaseDate: text("release_date"),
  genreIds: jsonb("genre_ids").$type<number[]>(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique("content_tmdb_id_type_unique").on(table.tmdbId, table.type),
]);

export const ratedContent = pgTable("rated_content", {
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: integer("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // Example: 1-5 stars, or -1/1 for like/dislike etc.
  ratedAt: timestamp("rated_at", { mode: 'string' }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.contentId], name: "rated_content_pk"}),
}));

export const wishlist = pgTable("wishlist", {
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  contentId: integer("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.contentId], name: "wishlist_pk"}),
}));


// --- Zod Schemas and TypeScript Types ---

// Auth Users (Supabase)
export const selectAuthUserSchema = createInsertSchema(authUsers);
export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = typeof authUsers.$inferInsert;

// Public Users (application specific table, distinct from Supabase auth.users)
export const insertPublicUserSchema = createInsertSchema(publicUsers).omit({ id: true, createdAt: true });
export const selectPublicUserSchema = createInsertSchema(publicUsers);
export type PublicUser = typeof publicUsers.$inferSelect;
export type InsertPublicUser = typeof publicUsers.$inferInsert;

// Profiles
export const insertProfileSchema = createInsertSchema(profiles, {
  email: z.string().email().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const selectProfileSchema = createInsertSchema(profiles);
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// Rooms
export const insertRoomSchema = createInsertSchema(rooms, {
  contentType: z.enum(['movie', 'tv']).optional(),
  status: z.enum(['waiting', 'voting', 'completed']).optional(),
}).omit({ id: true, createdAt: true });
export const selectRoomSchema = createInsertSchema(rooms);
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

// Room Participants
export const insertRoomParticipantSchema = createInsertSchema(roomParticipants).omit({ id: true, joinedAt: true });
export const selectRoomParticipantSchema = createInsertSchema(roomParticipants);
export type RoomParticipant = typeof roomParticipants.$inferSelect;
export type InsertRoomParticipant = typeof roomParticipants.$inferInsert;

// Votes
export const insertVoteSchema = createInsertSchema(votes).omit({ id: true, createdAt: true });
export const selectVoteSchema = createInsertSchema(votes);
export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

// User Sessions
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, completedAt: true });
export const selectUserSessionSchema = createInsertSchema(userSessions);
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// Streaming Services
export const insertStreamingServiceSchema = createInsertSchema(streamingServices, {
  name: z.string().min(1).optional(), // Name is unique but nullable in DB per pull
}).omit({ id: true, createdAt: true });
export const selectStreamingServiceSchema = createInsertSchema(streamingServices);
export type StreamingService = typeof streamingServices.$inferSelect;
export type InsertStreamingService = typeof streamingServices.$inferInsert;

// Watch Party Content
export const insertWatchPartyContentSchema = createInsertSchema(watchPartyContent, {
    contentType: z.enum(['movie', 'show']), // from check constraint
}).omit({ id: true, addedAt: true });
export const selectWatchPartyContentSchema = createInsertSchema(watchPartyContent);
export type WatchPartyContent = typeof watchPartyContent.$inferSelect;
export type InsertWatchPartyContent = typeof watchPartyContent.$inferInsert;

// Watch Party Swipes
export const insertWatchPartySwipeSchema = createInsertSchema(watchPartySwipes, {
  action: z.enum(['right', 'left', 'up', 'down']),
}).omit({ id: true, createdAt: true });
export const selectWatchPartySwipeSchema = createInsertSchema(watchPartySwipes);
export type WatchPartySwipe = typeof watchPartySwipes.$inferSelect;
export type InsertWatchPartySwipe = typeof watchPartySwipes.$inferInsert;

// Content Ratings
export const insertContentRatingSchema = createInsertSchema(contentRatings, {
  rating: z.number().min(1).max(5).optional(),
}).omit({ id: true, createdAt: true });
export const selectContentRatingSchema = createInsertSchema(contentRatings);
export type ContentRating = typeof contentRatings.$inferSelect;
export type InsertContentRating = typeof contentRatings.$inferInsert;

// Content (New Table)
export const insertContentSchema = createInsertSchema(content, {
  type: z.enum(['movie', 'tv']),
  tmdbId: z.number().positive(),
}).omit({ id: true, createdAt: true });
export const selectContentSchema = createInsertSchema(content);
export type Content = typeof content.$inferSelect;
export type InsertContent = typeof content.$inferInsert;

// Rated Content (New Table)
export const insertRatedContentSchema = createInsertSchema(ratedContent, {
    rating: z.number(), // Add specific constraints if needed e.g. .min(1).max(5)
});
export const selectRatedContentSchema = createInsertSchema(ratedContent);
export type RatedContent = typeof ratedContent.$inferSelect;
export type InsertRatedContent = typeof ratedContent.$inferInsert;

// Wishlist (New Table)
export const insertWishlistSchema = createInsertSchema(wishlist);
export const selectWishlistSchema = createInsertSchema(wishlist);
export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = typeof wishlist.$inferInsert;
