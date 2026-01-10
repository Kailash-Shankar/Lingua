import { supabase } from "../../lib/supabase/client";

// Sign up a user
export const signUp = async ({ email, password, role }) => {
  const { data, error } = await supabase.auth.signUp(
    { email, password },
    { data: { role } } // store role as user metadata
  );
  return { data, error };
};

// Sign in
export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current user
export const getUser = () => supabase.auth.getUser();
