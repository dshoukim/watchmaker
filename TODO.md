# TODO

## Create a Secure Pattern for API Authentication & Authorization

**Goal:** Ensure all sensitive API endpoints require authentication and use the correct Supabase key, minimizing use of the service role key for user-facing endpoints.

### Subtasks:
- [ ] Audit all API endpoints for authentication requirements
- [ ] Require authentication (JWT) for all sensitive endpoints
- [ ] Only use the service role key for trusted, internal backend operations
- [ ] Update RLS policies to match intended access patterns
- [ ] Add middleware for authentication checks
- [ ] Add tests for unauthorized access
- [ ] Document the secure API pattern in the codebase

#### Endpoints that need security:
- [ ] `/api/auth/user/:id` (profile fetch)
- [ ] `/api/auth/user/:id/preferences` (update preferences)
- [ ] `/api/auth/signup` (user creation)
- [ ] `/api/auth/user/:supabase_id/rated-content` (fetch rated content)
- [ ] `/api/rooms` (room creation)
- [ ] `/api/rooms/:code` (room fetch)
- [ ] `/api/rooms/:code/join` (join room)
- [ ] `/api/rooms/:code/content-type` (set content type)
- [ ] `/api/votes` (vote submission)
- [ ] `/api/rooms/:code/votes` (fetch votes)
- [ ] `/api/rooms/:code/results` (fetch results)
- [ ] `/api/profiles/:id/sessions` (fetch user sessions)
- [ ] `/api/streaming-services` (fetch streaming services)
- [ ] `/api/test/rooms-table` (test endpoint)

---

*This task is a priority for production security. Review and address each subtask before launch or as soon as possible.* 