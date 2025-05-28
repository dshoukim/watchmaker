# Project Improvement Plan

This document outlines a plan to address performance issues, feature gaps, and security concerns within the WatchTogether application.

**Guiding Principles for Execution:**
*   **Prioritization within Phases:** While phases define a sequence, individual action items within each phase should be further prioritized (e.g., P0, P1, P2) to tackle the most critical elements first.
*   **Definition of Done (DoD):** For clarity and quality, establish a "Definition of Done" for key categories of tasks (e.g., backend methods, API endpoints, UI components).
*   **Integrated Testing:** Continuously apply relevant testing strategies (unit, integration, E2E) throughout development rather than as an afterthought.
*   **Ongoing Documentation:** Maintain and update documentation (code comments, READMEs, API specs, this plan) as the project evolves.

## Phase 1: Core Functionality & Security Hardening (Highest Priority)

**1. Implement Core Room & Voting Logic (Server-Side - `storage.ts` & `routes.ts`):**

    **1.1. User and Session Management (`storage.ts` & `routes.ts`):**
        - **1.1.1 (storage.ts):** Implement `getUser(id: number)` (if `public.users` table is kept).
        - **1.1.2 (storage.ts):** Implement `createUserSession(session: InsertUserSession)`.
        - **1.1.3 (routes.ts):** Integrate `getUser` and `createUserSession` into relevant API endpoints (e.g., profile endpoints, potentially session creation/validation if applicable here).

    **1.2. Room Creation and Basic Retrieval (`storage.ts` & `routes.ts`):**
        - **1.2.1 (storage.ts):** Implement `createRoom(room: InsertRoom)`.
        - **1.2.2 (storage.ts):** Implement `getRoomByCode(code: string)`.
        - **1.2.3 (routes.ts - Room Code Generation):** Implement robust `generateRoomCode()` logic in `server/routes.ts`, ensuring uniqueness by using `storage.getRoomByCode`. (Note: For very high-volume room creation, this might be an area for future optimization, e.g., pre-generating codes.)
        - **1.2.4 (routes.ts):** Integrate `createRoom` and `getRoomByCode` into API endpoints for creating and joining/fetching rooms.

    **1.3. Room State and Data Updates (`storage.ts` & `routes.ts`):**
        - **1.3.1 (storage.ts):** Implement `updateRoomStatus(id: number, status: ...)`.
        - **1.3.2 (storage.ts):** Implement `updateRoomRecommendations(id: number, recommendations: any[])`.
        - **1.3.3 (storage.ts):** Implement `updateRoomResults(id: number, results: any[])`.
        - **1.3.4 (routes.ts):** Integrate these update methods into API endpoints that modify room state (e.g., starting voting, posting recommendations, finalizing results).

    **1.4. Room Participant Management (`storage.ts` & `routes.ts`):**
        - **1.4.1 (storage.ts):** Implement `addParticipant(participant: InsertRoomParticipant)`.
        - **1.4.2 (storage.ts):** Implement `getRoomParticipants(roomId: number)`.
        - **1.4.3 (storage.ts):** Implement `getParticipantByRoomAndUser(roomId: number, userId: number)`.
        - **1.4.4 (routes.ts):** Integrate participant management methods into relevant API endpoints (e.g., joining a room, fetching participant lists).

    **1.5. Voting Logic and Data (`storage.ts` & `routes.ts`):**
        - **1.5.1 (storage.ts):** Implement `getUserVotesForRoom(roomId: number, userId: number)`.
        - **1.5.2 (storage.ts):** Implement `getRoomVotes(roomId: number)`.
        - **1.5.3 (routes.ts):** Integrate voting data retrieval methods into API endpoints used during the voting phase.
        - **1.5.4 (routes.ts - Results Calculation):** Complete the server-side logic for `calculateResults`.
        - **1.5.5 (routes.ts & storage.ts Integration):** Ensure `calculateResults` correctly calls `storage.updateRoomResults` and `storage.updateRoomStatus`.
        - **1.5.6 (routes.ts - WebSocket):** Ensure WebSocket broadcasts for voting completion (`voting-completed`) are triggered with the correct results from `calculateResults`.

    **1.6. General Route Handler Refinement (`routes.ts`):**
        - **1.6.1:** Systematically review all placeholder API responses (e.g., `res.status(501).json(...)`) in `server/routes.ts` and replace them with functional logic, ensuring they utilize the newly implemented `storage.ts` methods. (This can be done iteratively as each group of storage methods is completed).

    **1.7. User ID Standardization Review:**
        - **1.7.1:** As part of implementing items 1.1-1.6, continuously review and ensure consistent and clear usage of user IDs (`profiles.id` UUID vs. `public.users` integer ID), strongly preferring the UUID for new logic and foreign keys. Document any necessary deviations.

**2. Fix API Security:**
    - **Action Item (Environment Variables):** Remove *all* hardcoded API keys and tokens (Supabase URL, Supabase Anon Key, Supabase Service Role Key if used, TMDB API Key, TMDB Access Token) from `server/routes.ts` and `server/storage.ts`.
        - Modify the code to *only* load these values from `process.env`.
        - Add checks at server startup in `server/index.ts` to ensure essential environment variables are present; if not, log an error and exit the process.
        - Develop a strategy for managing different deployment environments (e.g., local development, staging/preview, production) and their respective configurations.
    - **Action Item (Supabase Client Helper):** Refine the `getSupabaseClient` function in `server/routes.ts`:
        - For API endpoints that require strict user authentication, modify the helper to throw an error if no valid user JWT is present (instead of falling back to an anon client).
        - Clearly identify which endpoints can use the anon key and which must have an authenticated user.
    - **Action Item (Input Validation):** Implement rigorous server-side input validation for all API request bodies, parameters, and headers to protect against common vulnerabilities (e.g., XSS, SQL injection patterns, data type mismatches).
    - **Action Item (Supabase Row Level Security - RLS):** Conduct a thorough review and implement/refine RLS policies on all relevant Supabase tables to ensure users can only access and modify data they are explicitly permitted to.
    - **Action Item (Consider Rate Limiting):** Evaluate and plan for implementing rate limiting on sensitive or resource-intensive API endpoints to prevent abuse and ensure service stability.

**3. Clarify and Refine User Data Model:**
    - **Action Item (Decision & Analysis):**
        - Decide on the necessity of the `public.users` table (integer ID) alongside the `profiles` table (UUID ID, linked to `auth.users`).
        - Analyze data stored in `public.users` vs. `profiles`. Identify any redundancy (e.g., email, name if also in `auth.users.raw_user_meta_data` or `profiles`).
    - **Action Item (If `public.users` is Redundant):**
        - Create a migration script/plan to move any essential unique data from `public.users` to `profiles`.
        - Update all server-side logic (`storage.ts`, `routes.ts`) and any relevant client-side calls to exclusively use the `profiles` table and Supabase Auth `user.id` (UUID from `profiles.id`) as the **single canonical user identifier for all new foreign key relationships**.
        - Remove the `public.users` table from the database schema (`migrations/schema.ts` and `shared/schema.ts`) and an actual database migration to drop it.
    - **Action Item (If `public.users` is Necessary):**
        - Clearly document the distinct purpose of `public.users`.
        - Implement mechanisms or checks to ensure data consistency between `public.users`, `profiles`, and `auth.users` where overlap exists (e.g., ensuring `public.users.supabase_id` correctly links to `auth.users.id`).

## Phase 2: Client-Side Improvements & Feature Polish

**Note:** Aim to establish a "Definition of Done" for client-side tasks, e.g., component implemented, handles loading/error states, responsive, and basic UI tests passed.

**1. Consistent Client-Side Navigation:**
    - **Action Item:** Audit the client-side codebase (e.g., `dashboard.tsx`, `profile-settings.tsx`) for any remaining instances of `window.location.href` for internal navigation.
    - Replace these with `setLocation` (or `navigate` alias) from `wouter`'s `useLocation` hook for all internal app routing.

**2. Standardize Client-Side Data Fetching with TanStack Query:**
    - **Action Item:** Identify all direct `fetch` calls within React components (e.g., `loadRecentSessions` in `dashboard.tsx`).
    - Refactor these data-fetching operations to use `useQuery` (for GET requests) or `useMutation` (for POST/PUT/DELETE requests) from TanStack Query, leveraging the existing `client/src/lib/queryClient.ts`.
    - Define appropriate query keys and ensure server state is managed effectively through TanStack Query.

**3. Enhance WebSocket Client-Side Handling:**
    - **Action Item:** Review `client/src/lib/websocket.ts` and the `useRoom` hook.
    - Implement more robust error handling for WebSocket connection failures or unexpected messages.
    - Consider adding simple reconnection logic with **exponential** backoff for transient network issues.
    - Ensure UI provides clear feedback to the user if WebSocket connection is lost or cannot be established.

**4. Improve UI Loading States & Error Feedback:**
    - **Action Item:** For all asynchronous operations (API calls, WebSocket interactions):
        - Implement granular loading states in components (e.g., disable buttons and show loading text/spinners, use skeleton loaders for content sections).
        - Ensure comprehensive error handling that provides user-friendly `toast` notifications or inline error messages for all potential failure points.
    - **Action Item (Database Indexing):** Monitor query performance for key operations once the application has some usage. Use `EXPLAIN` in the Supabase SQL editor to analyze slow queries and add database indexes to relevant columns (e.g., foreign keys, columns frequently used in `WHERE` clauses or for sorting).
    - **Action Item (Server-Side Caching):** For data that changes infrequently but is requested often (e.g., TMDB genres, popular/static recommendations), evaluate implementing server-side caching (e.g., in-memory cache with a TTL using a simple Node.js library, or a dedicated caching service like Redis if future scaling demands it). Ensure TMDB API interactions respect their rate limits; caching TMDB data is crucial here.

**5. Complete UI Implementation for Core Watch Party Features:**
    - **Action Item:** Once Phase 1 server-side logic is complete, thoroughly test and complete the UI and state management in `room.tsx`, `voting.tsx`, and `results.tsx`.
    - Ensure seamless data flow from API calls and WebSocket messages to the UI.
    - Verify all user interactions within the watch party flow are intuitive and provide appropriate feedback.

## Phase 3: Performance Optimization & Advanced Features

**1. Client-Side Performance Audit & Optimization:**
    - **Action Item (Bundle Analysis):** After major features are stable, use tools like `vite-plugin-inspect` or `rollup-plugin-visualizer` to analyze the production bundle size. Identify and optimize large dependencies or custom code chunks. Consider code-splitting for routes or large components if beneficial.
    - **Action Item (React Profiling):** If specific UI interactions feel slow, use the React DevTools Profiler to identify component rendering bottlenecks. Apply optimizations like `React.memo`, `useMemo`, and `useCallback` strategically.
    - **Action Item (List Virtualization):** Evaluate if any lists in the application (e.g., movie recommendations if they can become very long, chat messages if a chat is added) would benefit from list virtualization (`react-virtual` or `react-window`) to improve rendering performance.

**2. Server-Side Performance Enhancements:**
    - **Action Item (Database Indexing):** Monitor query performance for key operations once the application has some usage. Use `EXPLAIN` in the Supabase SQL editor to analyze slow queries and add database indexes to relevant columns (e.g., foreign keys, columns frequently used in `WHERE` clauses or for sorting).
    - **Action Item (Server-Side Caching):** For data that changes infrequently but is requested often (e.g., TMDB genres, popular/static recommendations), evaluate implementing server-side caching (e.g., in-memory cache with a TTL using a simple Node.js library, or a dedicated caching service like Redis if future scaling demands it).

**3. Ongoing UX/Feature Enhancements:**
    - **Action Item (Backlog Creation):** Based on user feedback and product vision, create a backlog of potential new features or enhancements, such as:
        - Search and filtering capabilities for movies/shows.
        - User notifications system (in-app or push).
        - More detailed user profiles and advanced preference settings.
        - "Forgot Password" flow (if not solely relying on Supabase's UI for this).
        - Accessibility (a11y) audit and improvements following WCAG guidelines.
        - Enhancements to the watch party experience (e.g., chat, synchronized playback controls if video streaming is integrated). 