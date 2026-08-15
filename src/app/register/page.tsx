"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950"
      >
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Create your account
        </h1>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Username
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="rounded-md border border-black/[.08] px-3 py-2 text-base text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-black/[.08] px-3 py-2 text-base text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-md border border-black/[.08] px-3 py-2 text-base text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            />
          </label>
        </div>

        {state?.error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p className="mt-4 text-sm text-green-700 dark:text-green-400">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {pending ? "Creating account…" : "Sign up"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-950 dark:text-zinc-50">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
