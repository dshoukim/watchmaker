ALTER TABLE "auth"."users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "auth"."users" CASCADE;--> statement-breakpoint
ALTER TABLE "content" DROP CONSTRAINT "content_tmdb_id_type_unique";--> statement-breakpoint
ALTER TABLE "content_ratings" DROP CONSTRAINT "content_ratings_content_id_watch_party_content_id_fk";
--> statement-breakpoint
ALTER TABLE "content_ratings" DROP CONSTRAINT "content_ratings_user_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_id_fkey";
--> statement-breakpoint
ALTER TABLE "rated_content" DROP CONSTRAINT "rated_content_user_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "rated_content" DROP CONSTRAINT "rated_content_content_id_content_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_party_content" DROP CONSTRAINT "watch_party_content_added_by_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_party_swipes" DROP CONSTRAINT "watch_party_swipes_content_id_watch_party_content_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_party_swipes" DROP CONSTRAINT "watch_party_swipes_user_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "wishlist" DROP CONSTRAINT "wishlist_user_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "wishlist" DROP CONSTRAINT "wishlist_content_id_content_id_fk";
--> statement-breakpoint
ALTER TABLE "rated_content" DROP CONSTRAINT "rated_content_pk";--> statement-breakpoint
ALTER TABLE "wishlist" DROP CONSTRAINT "wishlist_pk";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "streaming_platforms" SET DATA TYPE bigint[];--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "streaming_platforms" SET DEFAULT '{}'::bigint[];--> statement-breakpoint
ALTER TABLE "rated_content" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "streaming_services" ALTER COLUMN "id" SET MAXVALUE 9223372036854776000;--> statement-breakpoint
ALTER TABLE "wishlist" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "rated_content" ADD CONSTRAINT "rated_content_user_id_content_id_pk" PRIMARY KEY("user_id","content_id");--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_content_id_pk" PRIMARY KEY("user_id","content_id");--> statement-breakpoint
ALTER TABLE "content_ratings" ADD CONSTRAINT "content_ratings_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."watch_party_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_ratings" ADD CONSTRAINT "content_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_content" ADD CONSTRAINT "watch_party_content_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_swipes" ADD CONSTRAINT "watch_party_swipes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."watch_party_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_swipes" ADD CONSTRAINT "watch_party_swipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_tmdb_id_unique" UNIQUE("tmdb_id");--> statement-breakpoint
DROP SCHEMA "auth";
