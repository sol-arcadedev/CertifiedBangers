"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { INPUT, LABEL, BUTTON_PRIMARY, LINK, CARD } from "@/lib/ui-classes";

const initialState: AuthActionState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <form action={formAction} className={`w-full max-w-sm ${CARD} p-8`}>
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Create your account</h1>

        <div className="flex flex-col gap-4">
          <label className={LABEL}>
            Username
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className={INPUT}
            />
          </label>

          <label className={LABEL}>
            Email
            <input name="email" type="email" required autoComplete="email" className={INPUT} />
          </label>

          <label className={LABEL}>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={INPUT}
            />
          </label>
        </div>

        {state?.error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {state.error}
          </p>
        )}
        {state?.message && <p className="mt-4 text-sm text-emerald-400">{state.message}</p>}

        <button type="submit" disabled={pending} className={`mt-6 flex h-11 w-full ${BUTTON_PRIMARY}`}>
          {pending ? "Creating account…" : "Sign up"}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className={`font-medium ${LINK}`}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
