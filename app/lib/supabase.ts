import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vbfedezlshgmrevabyeh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZmVkZXpsc2hnbXJldmFieWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDU2MTYsImV4cCI6MjA4MzgyMTYxNn0.2OVY8gcHnKAltiPB4OaO8EJ8mA7lmPJN6feAJa0dkts';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
