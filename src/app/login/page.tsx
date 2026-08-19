"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { INPUT, LABEL, BUTTON_PRIMARY, LINK, CARD } from "@/lib/ui-classes";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <form action={formAction} className={`w-full max-w-sm ${CARD} p-8`}>
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Log in</h1>

        <div className="flex flex-col gap-4">
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
              autoComplete="current-password"
              className={INPUT}
            />
          </label>
        </div>

        {state?.error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className={`mt-6 flex h-11 w-full ${BUTTON_PRIMARY}`}>
          {pending ? "Logging in…" : "Log in"}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className={`font-medium ${LINK}`}>
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
