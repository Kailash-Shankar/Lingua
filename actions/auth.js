"use server"

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // 1. Extract the role from the database (metadata)
  // We saved this as 'user_role' during the signup process
  const userRole = data.user.user_metadata?.user_role;
  const userId = data.user.id;

  // 2. Clear the cache so the session is recognized globally
  revalidatePath("/", "layout");

  // 3. Perform the conditional redirect
  if (userRole === "teacher") {
    redirect("/teacher/dashboard");
  } else {
    
    redirect(`/student/${userId}/dashboard`);
  }
}

export async function signup(formData) {
  const supabase = await createClient();

  const email = formData.get("email");
  const password = formData.get("password");
  const role = formData.get("role"); // Captured from your RadioGroup

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_role: role, // This is crucial for the Metadata
      },
    },
  });

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // ✅ Auto-redirect if Email Confirmation is OFF
  if (data?.user && data.session) {
    const userId = data.user.id;
    revalidatePath("/", "layout");
    return redirect(role === "teacher" ? "/teacher/dashboard" : `/student/${userId}/dashboard`);
  }

  // If Email Confirmation is ON
  return redirect("/login?message=Check your email to verify your account");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}