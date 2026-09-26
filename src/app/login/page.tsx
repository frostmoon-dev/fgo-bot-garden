"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Login failed");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <form onSubmit={submit} className="card w-full max-w-md p-7 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Chaldea access</p>
          <h1 className="mt-3 font-title text-4xl font-semibold tracking-[0.04em]">Bot Garden</h1>
        </div>
        <p className="text-sm text-muted">Enter your password to continue.</p>
        <label className="mt-7 block">
          <span className="sr-only">Password</span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          disabled={pending || !password}
          className="mt-5 min-h-11 w-full rounded-xl bg-accent font-semibold text-on-accent shadow-[0_10px_20px_rgba(215,176,106,0.2)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
