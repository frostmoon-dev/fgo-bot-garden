"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChaldeaEmblem } from "@/components/ui/ChaldeaEmblem";

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
      <form onSubmit={submit} className="card w-full max-w-md p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <ChaldeaEmblem className="size-20 text-accent" />
          <h1 className="wordmark wordmark-lg mt-3">Bond Garden</h1>
          <p className="mt-3 text-sm text-muted">Enter your password to continue.</p>
        </div>
        <label className="mt-6 block">
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
          className="btn btn-primary mt-4 w-full"
        >
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
