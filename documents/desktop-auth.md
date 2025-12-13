# 🖥️ BaseBrain Desktop App Authentication

This document describes the authentication implementation for the BaseBrain Electron desktop app. The desktop app connects to the web app (basebrain.dev) to securely obtain login credentials.

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Authentication Flow](#authentication-flow)
4. [Project Structure](#project-structure)
5. [Implementation Details](#implementation-details)
6. [Route Protection](#route-protection)
7. [Session Management](#session-management)
8. [Security Considerations](#security-considerations)
9. [Error Handling](#error-handling)
10. [Implementation Checklist](#implementation-checklist)

---

## 🎯 Overview

### The Problem

Desktop apps (like Electron apps) need to authenticate users, but:
- We don't want users to type passwords directly in the desktop app (less secure)
- We want to reuse Google OAuth and other web-based login methods from the web app
- Tokens need to be stored securely on the user's computer
- Sessions should persist across app restarts
- All routes except `/login` must be protected

### The Solution

Use a **browser-based OAuth flow** where:
1. Desktop app opens the browser to `basebrain.dev/authorization`
2. User authenticates on the web
3. Web app sends tokens back to desktop via localhost POST
4. Desktop stores tokens securely using OS keychain (keytar)
5. Supabase client is initialized with the stored tokens

---

## 🛠️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.x | Frontend framework (App Router) |
| **Electron** | 39.x | Desktop app runtime |
| **Supabase** | Latest | Auth & Database |
| **keytar** | Latest | Secure OS keychain storage |
| **TypeScript** | 5.x | Type safety |

### Key Packages

```bash
# Production dependencies
npm install @supabase/supabase-js keytar

# Development dependencies
npm install --save-dev @types/keytar electron-rebuild
```

---

## 🔄 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

1. User clicks "Login" in desktop app
                    ↓
2. Electron starts localhost HTTP server on random port
                    ↓
3. Desktop opens browser to: basebrain.dev/authorization?callback=http://127.0.0.1:{port}/authorize
                    ↓
4. User logs in via web (Google OAuth, email/password, etc.)
                    ↓
5. Web app POSTs session tokens to the callback URL
                    ↓
6. Desktop receives tokens and stores in keytar (OS keychain)
                    ↓
7. Desktop initializes Supabase with stored tokens
                    ↓
8. User is redirected to main app (/)
                    ↓
9. Supabase auto-refreshes tokens when they expire
                    ↓
10. Desktop saves new tokens on each refresh
                    ↓
11. User stays logged in across app restarts! ✨
```

### Session Data Structure

The web app sends the following JSON payload:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "abc123...",
  "expires_in": 3600,
  "expires_at": 1702500000,
  "token_type": "bearer",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://..."
  }
}
```

---

## 📁 Project Structure

All Electron/system-level code resides in the `/system` folder:

```
basebrain/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (wraps AuthProvider)
│   ├── page.tsx                  # Main app page (protected)
│   ├── login/
│   │   └── page.tsx              # Login page (public)
│   └── globals.css
│
├── lib/                          # Shared utilities
│   ├── utils.ts                  # Existing utilities
│   ├── supabase.ts               # NEW: Supabase client for renderer
│   └── auth-provider.tsx         # NEW: Auth context + route guard
│
├── system/                       # Electron & system code
│   └── electron/
│       ├── main.ts               # Main process entry (UPDATED)
│       ├── preload.ts            # Preload script (UPDATED)
│       ├── auth.ts               # NEW: Keytar storage & OAuth flow
│       ├── ipc.ts                # NEW: IPC handlers
│       ├── config.ts             # NEW: Supabase credentials
│       ├── dist/                 # Compiled JS files
│       └── tools/
│
├── documents/
│   └── desktop-auth.md           # This documentation
│
├── package.json                  # Updated with new dependencies
└── tsconfig.electron.json        # Electron TypeScript config
```

---

## 💻 Implementation Details

### 1. Electron Auth Module (`system/electron/auth.ts`)

Handles secure token storage and OAuth flow:

```typescript
// Functions to implement:
saveSession(session)     // Store session in OS keychain via keytar
loadSession()            // Retrieve session from keytar
clearSession()           // Delete session from keytar (logout)
hasSession()             // Check if session exists
startAuthFlow()          // Start localhost server, open browser, wait for tokens
```

**Keytar Storage:**
- **Windows:** Credential Manager
- **macOS:** Keychain
- **Linux:** Secret Service (libsecret)

### 2. IPC Handlers (`system/electron/ipc.ts`)

Exposes auth functions to the renderer process:

```typescript
// IPC channels:
'auth:get-session'    // Returns stored session
'auth:has-session'    // Returns boolean
'auth:save-session'   // Saves refreshed tokens
'auth:logout'         // Clears session
'auth:login'          // Starts OAuth flow
```

### 3. Preload Script (`system/electron/preload.ts`)

Securely exposes APIs to renderer via contextBridge:

```typescript
contextBridge.exposeInMainWorld('electronAuth', {
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  hasSession: () => ipcRenderer.invoke('auth:has-session'),
  saveSession: (session) => ipcRenderer.invoke('auth:save-session', session),
  logout: () => ipcRenderer.invoke('auth:logout'),
  login: () => ipcRenderer.invoke('auth:login'),
});
```

### 4. Main Process (`system/electron/main.ts`)

Updated to:
- Register IPC handlers on app ready
- Check for existing session before loading URL
- Load `/login` if no session, `/` if session exists

```typescript
app.whenReady().then(async () => {
  registerIpcHandlers();
  
  const isLoggedIn = await hasSession();
  const url = isLoggedIn 
    ? 'http://localhost:3000/' 
    : 'http://localhost:3000/login';
  
  mainWindow.loadURL(url);
});
```

### 5. Supabase Client (`lib/supabase.ts`)

Client-side Supabase configuration:

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,      // We use keytar instead
    detectSessionInUrl: false,  // Not needed for desktop
  },
});

// Functions:
initializeSession(savedSession)         // Set session from keytar
setupTokenRefreshListener(onRefresh)    // Save new tokens when refreshed
```

### 6. Auth Provider (`lib/auth-provider.tsx`)

React context that handles:
- Loading session on mount
- Redirecting unauthenticated users to `/login`
- Providing user data to components
- Token refresh handling

```tsx
export function AuthProvider({ children }) {
  // 1. Check session via electronAuth.hasSession()
  // 2. If on protected route + no session → redirect to /login
  // 3. If session exists → initialize Supabase
  // 4. Setup token refresh listener
  // 5. Provide { user, isLoading, logout } to children
}
```

---

## 🔐 Route Protection

### Strategy: Dual-Layer Protection

**Layer 1: Electron Main Process**
- Checks keytar for session on app startup
- Controls initial URL (loads `/login` or `/` based on auth state)

**Layer 2: React AuthProvider**
- Client-side protection for navigation within the app
- Handles cases where user manually types a URL
- Provides loading state while checking auth

### Protected vs Public Routes

| Route | Access |
|-------|--------|
| `/login` | ✅ Public (only accessible route when not logged in) |
| `/` | 🔒 Protected |
| `/settings` | 🔒 Protected |
| `/chat/*` | 🔒 Protected |
| `/*` (all other) | 🔒 Protected |

### Why Not `proxy.ts`?

Next.js 16 renamed `middleware.ts` to `proxy.ts`, but recommends:
- **NOT using it for full auth** (security concerns)
- Handling auth at the **data layer** instead

For Electron apps, the **main process + client-side AuthProvider** is the ideal approach.

---

## 🔄 Session Management

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SESSION LIFECYCLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. Initial Login
   └── Tokens saved to keytar (access token valid ~1 hour)

2. App Startup
   ├── Load tokens from keytar
   ├── Call supabase.auth.setSession()
   └── Supabase validates & refreshes if needed

3. During Usage
   ├── Access token expires after ~1 hour
   ├── Supabase automatically uses refresh token
   ├── New tokens received
   └── onAuthStateChange fires with 'TOKEN_REFRESHED'

4. Token Refresh Event
   ├── Catch 'TOKEN_REFRESHED' event
   ├── Extract new tokens from session
   └── Save to keytar via electronAuth.saveSession()

5. Next App Launch
   └── Repeat from step 2 (tokens already fresh!)
```

### Token Expiry

| Token Type | Expires After | Refresh Behavior |
|------------|---------------|------------------|
| Access Token | ~1 hour | Auto-refreshed by Supabase |
| Refresh Token | ~7 days | Extended on each use |

**Key Point:** As long as the user opens the app at least once per week, they stay logged in forever!

---

## 🔒 Security Considerations

### Why Keytar?

| Storage Method | Security | Cross-platform |
|----------------|----------|----------------|
| Plain file | ❌ Readable by any app | ✅ |
| Encrypted file | ⚠️ Key management issue | ✅ |
| **Keytar (OS Keychain)** | ✅ OS-level encryption | ✅ |
| Browser localStorage | ❌ Not for desktop apps | ❌ |

### Supabase Credentials Safety

The **anon key** is designed to be public:
- Security is enforced by Row Level Security (RLS) policies
- The anon key only allows operations permitted by your RLS rules
- Actual secret is the user's session tokens (stored in keytar)

### Best Practices Implemented

1. ✅ **contextIsolation: true** - Renderer can't access Node.js
2. ✅ **nodeIntegration: false** - No direct Node access in renderer
3. ✅ **Only localhost callbacks** - Auth server only accepts 127.0.0.1
4. ✅ **CORS protection** - Only basebrain.dev can POST tokens
5. ✅ **5-minute timeout** - Auth server closes if no response
6. ✅ **Secure token storage** - Using OS keychain via keytar

---

## ⚠️ Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Session expired" | Refresh token expired (7+ days) | Clear session, redirect to login |
| "Network error" | No internet | Show offline state, retry later |
| "Invalid session" | Tokens corrupted | Clear keytar, redirect to login |
| "Keytar not available" | Native module issue | Run `npx electron-rebuild` |

### Error Handling Strategy

```typescript
try {
  const success = await initializeSession(savedSession);
  if (!success) {
    await window.electronAuth.logout();
    router.push('/login');
  }
} catch (error) {
  if (error.message.includes('refresh_token')) {
    await window.electronAuth.logout();
    toast.error('Session expired. Please log in again.');
    router.push('/login');
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: Dependencies & Configuration

- [x] Install `@supabase/supabase-js` and `keytar`
- [x] Install `@types/keytar` and `electron-rebuild`
- [x] Add `postinstall` script: `"postinstall": "electron-rebuild"`
- [x] Create `system/electron/config.ts` with Supabase credentials

### Phase 2: Electron Auth Module

- [x] Create `system/electron/auth.ts`
  - [x] `saveSession()` - Store in keytar
  - [x] `loadSession()` - Retrieve from keytar
  - [x] `clearSession()` - Delete from keytar
  - [x] `hasSession()` - Check existence
  - [x] `startAuthFlow()` - Localhost server + browser open

### Phase 3: IPC Handlers

- [x] Create `system/electron/ipc.ts`
  - [x] `auth:get-session` handler
  - [x] `auth:has-session` handler
  - [x] `auth:save-session` handler
  - [x] `auth:logout` handler
  - [x] `auth:login` handler

### Phase 4: Update Electron Files

- [x] Update `system/electron/preload.ts`
  - [x] Expose `electronAuth` API
  - [x] Add TypeScript declarations for `window.electronAuth`
- [x] Update `system/electron/main.ts`
  - [x] Import and call `registerIpcHandlers()`
  - [x] Check session before loading URL
  - [x] Load `/login` or `/` based on auth state

### Phase 5: Supabase & Auth Provider

- [x] Create `lib/supabase.ts`
  - [x] Create Supabase client with `persistSession: false`
  - [x] `initializeSession()` function
  - [x] `setupTokenRefreshListener()` function
- [x] Create `lib/auth-provider.tsx`
  - [x] AuthContext and AuthProvider
  - [x] Session checking on mount
  - [x] Redirect logic for protected routes
  - [x] Export `useAuth()` hook

### Phase 6: Update App Files

- [x] Update `app/layout.tsx`
  - [x] Wrap with `<AuthProvider>`
- [x] Update `app/login/page.tsx`
  - [x] Add loading states
  - [x] Call `window.electronAuth.login()` on button click
  - [x] Handle success/error
  - [x] Navigate to `/` on success

### Phase 7: Testing

- [ ] Login flow opens browser correctly
- [ ] Session is saved to keytar after login
- [ ] App loads saved session on restart
- [ ] Token refresh saves new tokens
- [ ] Logout clears session from keytar
- [ ] Protected routes redirect to login when not authenticated
- [ ] `/login` is accessible without authentication

---

## 📝 Notes

### Web App Dependency

The authorization flow requires `basebrain.dev/authorization` to be functional. This page:
1. Receives `callback` query parameter with localhost URL
2. Shows "Link to BaseBrain Desktop App" button
3. POSTs session data to the callback URL when clicked

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Next.js URL | `http://localhost:3000` | Bundled with Electron |
| Auth URL | `https://www.basebrain.dev/authorization` | Same |
| Token Storage | keytar (OS keychain) | Same |

---

*Last updated: December 13, 2025*
