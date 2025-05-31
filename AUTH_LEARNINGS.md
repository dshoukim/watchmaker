# Auth Implementation Learnings & Recovery Plan

## 🚨 Summary of Auth Issues

We've been struggling with authentication for several iterations. **OAuth works perfectly**, but the auth state management is broken. Here's what we've learned:

## ✅ What Actually Works

1. **Google OAuth Flow**: `signInWithGoogle()` redirects properly and completes successfully
2. **OAuth Tokens**: Access tokens, refresh tokens, and user data are returned correctly
3. **Server API**: `/api/auth/user/{id}` endpoint works and returns user data (6-7 second response time)
4. **User Data**: User exists in database with complete profile (genres, preferences, etc.)
5. **Supabase Config**: Environment variables and client setup are correct

## ❌ What's Broken

1. **`supabase.auth.getSession()`**: Consistently times out after 5+ seconds
2. **Auth State Change Listener**: `onAuthStateChange()` never triggers SIGNED_IN events
3. **Session Persistence**: Even after successful OAuth, sessions aren't recognized
4. **Auth Hook Loading**: Gets stuck in loading state, never resolves to authenticated state
5. **Manual Detection**: Even manually detecting OAuth callbacks doesn't properly set user state

## 🔍 Root Cause Analysis

The core issue is **Supabase's auth methods are unreliable** in this environment:
- `getSession()` hangs indefinitely
- `onAuthStateChange()` listener doesn't fire
- Auth state isn't persisting between page loads

This suggests either:
- **Configuration problem** with Supabase client
- **Network/timing issues** with auth API calls  
- **Environment conflict** between development setup and Supabase

## 📋 New Implementation Plan

### Phase 1: Minimal Auth (Reset & Rebuild)

**Goal**: Get basic OAuth working with manual session management

1. **Simplify Auth Hook**:
   ```typescript
   // Remove all complex logic, timeouts, listeners
   // Focus on: user state + loading state + basic methods
   ```

2. **Manual Session Detection**:
   ```typescript
   // On app load: check localStorage for user data
   // On OAuth callback: extract tokens from URL hash
   // Make direct API call to verify/fetch user
   ```

3. **Direct API Approach**:
   ```typescript
   // Skip supabase.auth.getSession() entirely
   // Use manual token management if needed
   // Call our own /api/auth/user endpoint directly
   ```

### Phase 2: OAuth Callback Handling

**Goal**: Reliable OAuth callback processing

1. **URL Hash Processing**:
   ```typescript
   // Detect access_token in URL hash
   // Extract user ID from token (or make API call)
   // Fetch user data from our API
   // Store in localStorage + React state
   // Clean up URL
   ```

2. **Session Persistence**:
   ```typescript
   // Store user data in localStorage
   // On app load, check localStorage first
   // Validate session with API call if needed
   ```

### Phase 3: Routing Integration

**Goal**: Proper routing based on auth state

1. **App.tsx Integration**:
   ```typescript
   // Use existing ProtectedRoute logic
   // Remove auth logic from routing layer
   // Let auth hook handle all state management
   ```

2. **Profile Completion Check**:
   ```typescript
   // Keep existing logic: !user.preferences?.genres?.length
   // Route to /profile-setup vs /dashboard accordingly
   ```

## 🛠 Technical Implementation

### New Auth Hook Structure
```typescript
export const useAuth = () => {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Method 1: Check localStorage on load
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  // Method 2: Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        // Extract user ID or make API call
        // Fetch user from /api/auth/user/{id}
        // setUser() and localStorage.setItem()
        // Clean URL
      }
    }
    handleOAuthCallback()
  }, [])

  const signInWithGoogle = () => {
    return supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return { user, loading, signInWithGoogle, signOut }
}
```

### Why This Approach Will Work

1. **Eliminates Supabase Auth Complexity**: No more `getSession()` or `onAuthStateChange()`
2. **Direct Control**: We manage auth state manually
3. **Reliable Storage**: localStorage persists between sessions
4. **Simple Flow**: OAuth → API call → localStorage → React state
5. **Debuggable**: Each step is explicit and can be logged

## 🎯 Success Criteria

✅ **User clicks "Continue with Google"**  
✅ **OAuth redirects and completes**  
✅ **User data is fetched from API**  
✅ **User state is set in React**  
✅ **User is routed to dashboard/profile-setup**  
✅ **Session persists on page refresh**  
✅ **Sign out works properly**  

## 🚀 Next Steps

1. **Archive current auth hook** (save as `use-auth-broken.tsx`)
2. **Create new minimal auth hook** following the plan above
3. **Test each phase incrementally**
4. **Add logging to track each step**
5. **Verify the complete flow works end-to-end**

This approach bypasses all the problematic Supabase auth methods and gives us direct control over the authentication flow. 