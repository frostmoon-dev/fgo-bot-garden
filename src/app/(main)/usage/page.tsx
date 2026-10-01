import Link from "next/link";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { usageSummary, type UsageRow } from "@/lib/data/queries";

const PURPOSES: Record<string, string> = {
  reply: "Story replies",
  scene: "Scene box",
  choices: "Choices",
  summary: "Story summaries",
  memory: "Character memories",
  write: "Write a scene",
  interlude: "Interludes",
  test: "Connection tests",
  other: "Other",
};

const n = (value: number) => new Intl.NumberFormat("en-GB", { notation: value >= 100_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
const cachedShare = (r: UsageRow) => (r.cacheReported && r.promptTokens ? `${Math.round((100 * r.cachedTokens) / r.promptTokens)}%` : "—");

function Table({ rows, label, name }: { rows: UsageRow[]; label: string; name: (key: string) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 pr-4 font-medium">{label}</th>
            <th className="py-2 pr-4 text-right font-medium">Requests</th>
            <th className="py-2 pr-4 text-right font-medium">Sent</th>
            <th className="py-2 pr-4 text-right font-medium">Cached</th>
            <th className="py-2 text-right font-medium">Written</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line last:border-b-0">
              <td className="py-2.5 pr-4">{name(r.key)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{n(r.requests)}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{r.counted ? n(r.promptTokens) : "—"}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{cachedShare(r)}</td>
              <td className="py-2.5 text-right tabular-nums">{r.counted ? n(r.completionTokens) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function UsagePage() {
  const usage = await usageSummary(30);
  const { total } = usage;
  const unreported = total.requests - total.counted;
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <>
      <Link href="/settings" className="inline-flex min-h-10 items-center text-sm text-muted hover:text-ink">
        ← Settings
      </Link>
      <PageHeader
        title="Usage"
        description="Tokens your AI requests used in the last 30 days. Sent is what the model read (most of it the story so far); cached is the share the provider reused, usually at a lower price; written is the reply."
      />
      {total.requests === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium">Nothing recorded yet</p>
          <p className="mt-1 text-sm text-muted">Token counts show up here after your next replies.</p>
          <Link href="/" className="btn btn-outline mt-6">
            Go to your stories
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Requests", n(total.requests)],
              ["Tokens sent", n(total.promptTokens)],
              ["Cached", cachedShare(total)],
              ["Tokens written", n(total.completionTokens)],
            ].map(([label, value]) => (
              <div key={label} className="card p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {unreported > 0 && (
            <p className="-mt-8 max-w-2xl text-sm text-muted">
              {n(unreported)} of {n(total.requests)} requests came from a provider that doesn&apos;t report token counts, so they aren&apos;t in the totals.
            </p>
          )}
          <p className="-mt-8 max-w-2xl text-sm text-muted">
            Prices differ per provider and model, so check your provider&apos;s pricing page for the cost. Free models cost nothing.
          </p>
          <section>
            <SectionTitle hint="What used the tokens. Story replies are the big ones; the rest are small extra requests you can turn off in Settings.">
              By purpose
            </SectionTitle>
            <Table rows={usage.byPurpose} label="Purpose" name={(k) => PURPOSES[k] ?? k} />
          </section>
          <section>
            <SectionTitle>By day</SectionTitle>
            <Table rows={usage.byDay} label="Day" name={(k) => day.format(new Date(`${k}T00:00:00Z`))} />
          </section>
          <section>
            <SectionTitle>By model</SectionTitle>
            <Table rows={usage.byModel} label="Model" name={(k) => k} />
          </section>
        </div>
      )}
    </>
  );
}
