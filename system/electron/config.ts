/**
 * Configuration for Electron main process.
 * Contains Supabase credentials and app settings.
 * 
 * NOTE: The anon key is designed to be public - security is enforced by RLS policies.
 */

// Keytar configuration for secure token storage
export const KEYTAR_SERVICE = "BaseBrain";
export const KEYTAR_ACCOUNT = "supabase_session";

// Web app URL for authorization
export const WEB_APP_URL = "https://www.basebrain.dev";

// Supabase configuration
export const SUPABASE_URL = "https://dtrhvwhdilpfxevvcqdx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cmh2d2hkaWxwZnhldnZjcWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Nzk5MjYsImV4cCI6MjA4MTA1NTkyNn0.atT6vF0OPybreAullYrXWRHNr9pT_DsolMnK-Wgb-K4";

