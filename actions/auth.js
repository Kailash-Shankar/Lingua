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

  // Pulling role from metadata
  const userRole = data.user.user_metadata?.user_role;
  const userId = data.user.id;

  revalidatePath("/", "layout");

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
  const role = formData.get("role"); 
  const firstName = formData.get("firstname"); 
  const lastName = formData.get("lastname");   
  const studentId = formData.get("student_id_number"); 

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_role: role,
        first_name: firstName,
        last_name: lastName,
        student_id: role === "student" ? studentId : null,
      },
    },
  });

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.user && data.session) {
    const userId = data.user.id;
    revalidatePath("/", "layout");
    return redirect(role === "teacher" ? "/teacher/dashboard" : `/student/${userId}/dashboard`);
  }

  return redirect("/login?message=Check your email to verify your account");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}