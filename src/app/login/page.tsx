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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 rounded-lg p-6">
        <h1 className="font-display text-2xl text-gold">Bot Garden</h1>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button disabled={pending || !password} className="w-full rounded-md bg-gold py-2 font-semibold text-night disabled:opacity-50">
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
