"use server";

// Server-side auth actions. These run on the server only — passwords never
// touch our own code beyond handing them straight to Supabase.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  // If "Confirm email" is OFF, Supabase returns a live session — the user is
  // already signed in, so send them straight into the app.
  if (data.session) {
    redirect("/");
  }

  // Otherwise "Confirm email" is ON: they must click the link in their inbox.
  redirect("/login?message=Check your email to confirm, then sign in.");
}

// Google sign-in is not enabled yet. Add a signInWithGoogle action back here
// (and the buttons) once the Google provider is configured in Supabase.

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
