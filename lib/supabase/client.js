
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// This client automatically looks at cookies, 
// which is why it will finally "see" your login session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);