import { relations } from "drizzle-orm/relations";
import { watchPartyContent, watchPartySwipes, profiles, contentRatings, usersInAuth, users, rooms, roomParticipants, votes, userSessions, content, wishlist, ratedContent } from "./schema";

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

export const watchPartyContentRelations = relations(watchPartyContent, ({one, many}) => ({
	watchPartySwipes: many(watchPartySwipes),
	contentRatings: many(contentRatings),
	profile: one(profiles, {
		fields: [watchPartyContent.addedBy],
		references: [profiles.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	watchPartySwipes: many(watchPartySwipes),
	contentRatings: many(contentRatings),
	usersInAuth: one(usersInAuth, {
		fields: [profiles.id],
		references: [usersInAuth.id]
	}),
	watchPartyContents: many(watchPartyContent),
	wishlists: many(wishlist),
	ratedContents: many(ratedContent),
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

export const wishlistRelations = relations(wishlist, ({one}) => ({
	content: one(content, {
		fields: [wishlist.contentId],
		references: [content.id]
	}),
	profile: one(profiles, {
		fields: [wishlist.userId],
		references: [profiles.id]
	}),
}));

export const contentRelations = relations(content, ({many}) => ({
	wishlists: many(wishlist),
	ratedContents: many(ratedContent),
}));

export const ratedContentRelations = relations(ratedContent, ({one}) => ({
	content: one(content, {
		fields: [ratedContent.contentId],
		references: [content.id]
	}),
	profile: one(profiles, {
		fields: [ratedContent.userId],
		references: [profiles.id]
	}),
}));