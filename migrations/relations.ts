import { relations } from "drizzle-orm/relations";
import { profiles, watchPartyContent, watchPartySwipes, contentRatings, usersInAuth, users, rooms, roomParticipants, votes, userSessions } from "./schema";

export const watchPartyContentRelations = relations(watchPartyContent, ({one, many}) => ({
	profile: one(profiles, {
		fields: [watchPartyContent.addedBy],
		references: [profiles.id]
	}),
	watchPartySwipes: many(watchPartySwipes),
	contentRatings: many(contentRatings),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	watchPartyContents: many(watchPartyContent),
	watchPartySwipes: many(watchPartySwipes),
	contentRatings: many(contentRatings),
	usersInAuth: one(usersInAuth, {
		fields: [profiles.id],
		references: [usersInAuth.id]
	}),
}));

export const watchPartySwipesRelations = relations(watchPartySwipes, ({one}) => ({
	watchPartyContent: one(watchPartyContent, {
		fields: [watchPartySwipes.contentId],
		references: [watchPartyContent.id]
	}),
	profile: one(profiles, {
		fields: [watchPartySwipes.userId],
		references: [profiles.id]
	}),
}));

export const contentRatingsRelations = relations(contentRatings, ({one}) => ({
	watchPartyContent: one(watchPartyContent, {
		fields: [contentRatings.contentId],
		references: [watchPartyContent.id]
	}),
	profile: one(profiles, {
		fields: [contentRatings.userId],
		references: [profiles.id]
	}),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	profiles: many(profiles),
}));

export const roomsRelations = relations(rooms, ({one, many}) => ({
	user: one(users, {
		fields: [rooms.hostId],
		references: [users.id]
	}),
	roomParticipants: many(roomParticipants),
	votes: many(votes),
	userSessions: many(userSessions),
}));

export const usersRelations = relations(users, ({many}) => ({
	rooms: many(rooms),
	roomParticipants: many(roomParticipants),
	votes: many(votes),
	userSessions: many(userSessions),
}));

export const roomParticipantsRelations = relations(roomParticipants, ({one}) => ({
	room: one(rooms, {
		fields: [roomParticipants.roomId],
		references: [rooms.id]
	}),
	user: one(users, {
		fields: [roomParticipants.userId],
		references: [users.id]
	}),
}));

export const votesRelations = relations(votes, ({one}) => ({
	room: one(rooms, {
		fields: [votes.roomId],
		references: [rooms.id]
	}),
	user: one(users, {
		fields: [votes.userId],
		references: [users.id]
	}),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	room: one(rooms, {
		fields: [userSessions.roomId],
		references: [rooms.id]
	}),
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));