import { pgTable, foreignKey, unique, pgPolicy, check, uuid, text, integer, timestamp, bigint, jsonb, boolean, date, serial, primaryKey, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const watchPartySwipes = pgTable("watch_party_swipes", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	watchPartyId: uuid("watch_party_id").notNull(),
	contentId: uuid("content_id").notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	points: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.contentId],
			foreignColumns: [watchPartyContent.id],
			name: "watch_party_swipes_content_id_watch_party_content_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "watch_party_swipes_user_id_profiles_id_fk"
		}),
	unique("watch_party_swipes_watch_party_id_content_id_user_id_key").on(table.watchPartyId, table.contentId, table.userId),
	pgPolicy("swipes_insert_policy", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = auth.uid())`  }),
	check("watch_party_swipes_action_check", sql`action = ANY (ARRAY['right'::text, 'left'::text, 'up'::text, 'down'::text])`),
]);

export const contentRatings = pgTable("content_ratings", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	watchPartyId: uuid("watch_party_id"),
	contentId: uuid("content_id"),
	userId: uuid("user_id").notNull(),
	rating: integer(),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.contentId],
			foreignColumns: [watchPartyContent.id],
			name: "content_ratings_content_id_watch_party_content_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "content_ratings_user_id_profiles_id_fk"
		}),
	unique("content_ratings_watch_party_id_content_id_user_id_key").on(table.watchPartyId, table.contentId, table.userId),
	pgPolicy("ratings_insert_policy", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = auth.uid())`  }),
	pgPolicy("ratings_update_policy", { as: "permissive", for: "update", to: ["public"] }),
	check("content_ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const streamingServices = pgTable("streaming_services", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "streaming_services_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text(),
	logoUrl: text("logo_url"),
}, (table) => [
	unique("streaming_services_name_key").on(table.name),
	pgPolicy("Enable read access for all users", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	username: text(),
	avatarUrl: text("avatar_url"),
	email: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	streamingPlatforms: bigint("streaming_platforms", { mode: "number" }).array().default([]),
	contentPreferences: jsonb("content_preferences").default({}),
	isProfileComplete: boolean("is_profile_complete").default(false),
	firstName: text("first_name"),
	lastName: text("last_name"),
	gender: text(),
	dateOfBirth: date("date_of_birth"),
	city: text(),
	profileCompleted: boolean("profile_completed").default(false),
	preferences: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "profiles_id_fkey"
		}),
	pgPolicy("profiles_select_policy", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("profiles_update_policy", { as: "permissive", for: "update", to: ["public"] }),
]);

export const watchPartyContent = pgTable("watch_party_content", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	watchPartyId: uuid("watch_party_id").notNull(),
	tmdbId: text("tmdb_id").notNull(),
	contentType: text("content_type").notNull(),
	title: text().notNull(),
	posterPath: text("poster_path"),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	addedBy: uuid("added_by"),
	totalScore: integer("total_score").default(0),
	likeCount: integer("like_count").default(0),
	dislikeCount: integer("dislike_count").default(0),
	superlikeCount: integer("superlike_count").default(0),
	metadata: jsonb().default({}),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [profiles.id],
			name: "watch_party_content_added_by_profiles_id_fk"
		}),
	unique("watch_party_content_watch_party_id_tmdb_id_key").on(table.watchPartyId, table.tmdbId),
	check("watch_party_content_content_type_check", sql`content_type = ANY (ARRAY['movie'::text, 'show'::text])`),
]);

export const rooms = pgTable("rooms", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	hostId: integer("host_id").notNull(),
	contentType: text("content_type"),
	status: text().default('waiting').notNull(),
	recommendations: jsonb(),
	results: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.hostId],
			foreignColumns: [users.id],
			name: "rooms_host_id_users_id_fk"
		}),
	unique("rooms_code_unique").on(table.code),
]);

export const roomParticipants = pgTable("room_participants", {
	id: serial().primaryKey().notNull(),
	roomId: integer("room_id").notNull(),
	userId: integer("user_id").notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "room_participants_room_id_rooms_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "room_participants_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	supabaseId: text("supabase_id").notNull(),
	email: text().notNull(),
	name: text().notNull(),
	avatar: text(),
	preferences: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_supabase_id_unique").on(table.supabaseId),
]);

export const votes = pgTable("votes", {
	id: serial().primaryKey().notNull(),
	roomId: integer("room_id").notNull(),
	userId: integer("user_id").notNull(),
	movieId: integer("movie_id").notNull(),
	score: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "votes_room_id_rooms_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "votes_user_id_users_id_fk"
		}),
]);

export const userSessions = pgTable("user_sessions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	roomId: integer("room_id").notNull(),
	selectedMovieId: integer("selected_movie_id"),
	selectedMovieTitle: text("selected_movie_title"),
	completedAt: timestamp("completed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "user_sessions_room_id_rooms_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sessions_user_id_users_id_fk"
		}),
]);

export const content = pgTable("content", {
	id: serial().primaryKey().notNull(),
	tmdbId: integer("tmdb_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	overview: text(),
	posterPath: text("poster_path"),
	releaseDate: text("release_date"),
	genreIds: jsonb("genre_ids"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imdbId: text("imdb_id"),
	rottenTomatoesRating: integer("rotten_tomatoes_rating"),
	streamingProviders: jsonb("streaming_providers"),
	trailerUrl: text("trailer_url"),
}, (table) => [
	unique("content_tmdb_id_type_unique").on(table.tmdbId, table.type),
]);

export const wishlist = pgTable("wishlist", {
	userId: uuid("user_id").notNull(),
	contentId: integer("content_id").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.contentId],
			foreignColumns: [content.id],
			name: "wishlist_content_id_content_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "wishlist_user_id_profiles_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.contentId], name: "wishlist_pk"}),
]);

export const ratedContent = pgTable("rated_content", {
	userId: uuid("user_id").notNull(),
	contentId: integer("content_id").notNull(),
	rating: doublePrecision().notNull(),
	ratedAt: timestamp("rated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.contentId],
			foreignColumns: [content.id],
			name: "rated_content_content_id_content_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.id],
			name: "rated_content_user_id_profiles_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.contentId], name: "rated_content_pk"}),
]);
