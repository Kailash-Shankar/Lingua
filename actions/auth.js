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

export async function updateProfileMetadata(formData, courseId) {
  const supabase = await createClient();

  // 1. Get the current user to ensure they are authorized
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const firstName = formData.get("first_name");
  const lastName = formData.get("last_name");
  const studentId = formData.get("student_id");

  // 2. Perform the update
  const { data, error } = await supabase
    .from("course_enrollments")
    .update({
      First_Name: firstName,
      Last_Name: lastName,
      Student_id: studentId // Remember: studentId is stored as requested
    })
    .match({ 
      user_id: user.id, // Security: Only update rows belonging to this user
      course_id: courseId // Specificity: Only update for this course
    })
    .select(); // Returns the updated row

  if (error) {
    console.error("Update error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}