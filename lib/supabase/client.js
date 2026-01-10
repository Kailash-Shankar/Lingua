// import { createClient } from "@supabase/supabase-js";
// console.log("Supabase URL Check:", process.env.NEXT_PUBLIC_SUPABASE_URL);
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// export const supabase = createClient(supabaseUrl, supabasePublicKey);

// // import { createBrowserClient } from "@supabase/ssr";

// // export const supabase = createBrowserClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL,
// //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// // );

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// This client automatically looks at cookies, 
// which is why it will finally "see" your login session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);