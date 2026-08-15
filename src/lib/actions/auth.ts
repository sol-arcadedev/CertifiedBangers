"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthActionState = {
  error?: string;
  message?: string;
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Username must be 3-20 characters: letters, numbers, underscores only.",
    };
  }
  if (!email) {
    return { error: "Email is required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "That username is already taken." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }
  // Supabase returns a user with no identities (instead of an error) when
  // the email is already registered, to avoid leaking which emails exist.
  if (!data.user || data.user.identities?.length === 0) {
    return { error: "That email is already registered." };
  }

  try {
    await prisma.user.create({
      data: { id: data.user.id, username, email },
    });
  } catch {
    return {
      error:
        "Could not create your profile (username or email may already be in use).",
    };
  }

  if (!data.session) {
    return {
      message: "Account created — check your email to confirm before logging in.",
    };
  }

  redirect(`/profile/${username}`);
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const profile = await prisma.user.findUnique({
    where: { id: data.user.id },
  });

  redirect(profile ? `/profile/${profile.username}` : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
