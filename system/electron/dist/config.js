"use strict";
/**
 * Configuration for Electron main process.
 * Contains Supabase credentials and app settings.
 *
 * NOTE: The anon key is designed to be public - security is enforced by RLS policies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPABASE_ANON_KEY = exports.SUPABASE_URL = exports.WEB_APP_URL = exports.KEYTAR_ACCOUNT = exports.KEYTAR_SERVICE = void 0;
// Keytar configuration for secure token storage
exports.KEYTAR_SERVICE = "BaseBrain";
exports.KEYTAR_ACCOUNT = "supabase_session";
// Web app URL for authorization
exports.WEB_APP_URL = "https://www.basebrain.dev";
// Supabase configuration
exports.SUPABASE_URL = "https://dtrhvwhdilpfxevvcqdx.supabase.co";
exports.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cmh2d2hkaWxwZnhldnZjcWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Nzk5MjYsImV4cCI6MjA4MTA1NTkyNn0.atT6vF0OPybreAullYrXWRHNr9pT_DsolMnK-Wgb-K4";
