"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { listModels, removeConnection, saveConnection, testConnection, type TestResult } from "@/app/actions/connection";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import type { ConnectionView } from "@/lib/llm/connection";
import { PROVIDERS, type ProviderId } from "@/lib/llm/providers";
import { askConfirm } from "@/components/ui/dialogs";

function origin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function StatusLine({ view }: { view: ConnectionView }) {
  if (view.source === "none") {
    return (
      <p className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
        Not connected yet. Pick a provider, paste your API key, choose a model, then <strong>Test</strong> and <strong>Save</strong>.
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
      <span className="size-2 rounded-full bg-[#7fc98f]" aria-hidden />
      <span>
        Connected to <strong>{PROVIDERS[view.provider].label}</strong> · <span className="font-mono">{view.model}</span>
      </span>
      {view.source === "env" && <span className="text-muted">(from the server&apos;s LLM_* settings; saving here replaces them)</span>}
    </p>
  );
}

export function ConnectionForm({ view }: { view: ConnectionView }) {
  const router = useRouter();
  const listId = useId();
  const [provider, setProvider] = useState<ProviderId>(view.provider);
  const [baseUrl, setBaseUrl] = useState(view.baseUrl || PROVIDERS[view.provider].baseUrl);
  const [model, setModel] = useState(view.model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [tested, setTested] = useState<TestResult | null>(null);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  const preset = PROVIDERS[provider];
  // The saved key is tied to its address: another provider needs its own.
  const keyApplies = view.hasKey && !!origin(baseUrl) && origin(baseUrl) === origin(view.baseUrl);
  const needsKey = !keyApplies && !("keyOptional" in preset && preset.keyOptional) && !apiKey.trim();
  const input = { provider, baseUrl, model, apiKey };

  const changed = () => {
    setSaved(false);
    setTested(null);
  };

  function pickProvider(id: ProviderId) {
    changed();
    setProvider(id);
    setModels([]);
    if (PROVIDERS[id].baseUrl) setBaseUrl(PROVIDERS[id].baseUrl);
    if (id !== view.provider) setModel("");
  }

  return (
    <div className="max-w-3xl space-y-8">
      <StatusLine view={view} />

      <Label title="Provider" hint={preset.hint}>
        <select className="field" value={provider} onChange={(e) => pickProvider(e.target.value as ProviderId)}>
          {Object.entries(PROVIDERS).map(([id, p]) => (
            <option key={id} value={id}>
              {p.label}
            </option>
          ))}
        </select>
      </Label>

      <Label title="Address" hint="The provider's API base URL. Filled in for you; change it only for a custom server.">
        <TextInput
          value={baseUrl}
          onChange={(e) => {
            changed();
            setBaseUrl(e.target.value);
          }}
          placeholder="https://api.example.com/v1"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-sm"
        />
      </Label>

      <div>
        <Label
          title="API key"
          hint={
            view.keyUnreadable
              ? "The saved key can't be read any more (the server's AUTH_SECRET changed). Paste it again."
              : keyApplies
                ? `A key is saved for this address (${view.keyHint}). Leave this empty to keep it.`
                : "Stored encrypted on the server. It is never shown again or sent to the browser."
          }
        >
          <span className="flex gap-2">
            <TextInput
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                changed();
                setApiKey(e.target.value);
              }}
              placeholder={keyApplies ? `Saved (${view.keyHint})` : "Paste your API key"}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <Button variant="quiet" className="shrink-0" onClick={() => setShowKey((v) => !v)} aria-pressed={showKey}>
              {showKey ? "Hide" : "Show"}
            </Button>
          </span>
        </Label>
        {"keyUrl" in preset && preset.keyUrl && (
          <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-accent hover:underline">
            Get a {preset.label} API key ↗
          </a>
        )}
      </div>

      <div>
        <Label title="Model" hint="The model id, exactly as the provider writes it. Load the list to pick one.">
          <span className="flex gap-2">
            <TextInput
              value={model}
              onChange={(e) => {
                changed();
                setModel(e.target.value);
              }}
              list={listId}
              placeholder="Model id"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <Button
              className="shrink-0"
              disabled={pending || !baseUrl.trim()}
              onClick={() =>
                run(async () => {
                  const list = unwrap(await listModels({ provider, baseUrl, apiKey }));
                  setModels(list);
                  if (!model.trim() && list.length === 1) setModel(list[0]);
                })
              }
            >
              Load models
            </Button>
          </span>
          <datalist id={listId}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Label>
        {models.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            {models.length} models found. Click the model box and start typing to filter them.
          </p>
        )}
      </div>

      <p className="text-sm text-muted">
        Each model writes differently. After connecting, tune the prompt style, context size and reply length under{" "}
        <a href="/settings" className="text-accent hover:underline">
          Settings → AI model
        </a>
        .
      </p>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-canvas py-4">
        <Button
          variant="primary"
          disabled={pending || !model.trim() || !baseUrl.trim() || needsKey}
          title={needsKey ? "Paste an API key first" : undefined}
          onClick={() =>
            run(async () => {
              unwrap(await saveConnection(input));
              setApiKey("");
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? "Working…" : "Save connection"}
        </Button>
        <Button
          disabled={pending || !model.trim() || !baseUrl.trim() || needsKey}
          title="Sends one tiny request (a few tokens) with the values above"
          onClick={() =>
            run(async () => {
              setTested(null);
              setTested(unwrap(await testConnection(input)));
            })
          }
        >
          Test
        </Button>
        {tested && (
          <span role="status" className="text-sm">
            <span className="text-[#7fc98f]">Works</span> · answered in {(tested.ms / 1000).toFixed(1)} s{tested.reply && <> · “{tested.reply}”</>}
          </span>
        )}
        {saved && !tested && <span className="text-sm text-muted">Saved. New replies use this model.</span>}
      </div>
      <ErrorText error={error} />

      {view.source === "app" && (
        <section className="border-t border-line pt-8">
          <h2 className="text-sm font-medium">Remove the saved connection</h2>
          <p className="mt-1 text-sm text-muted">Deletes the address, model and API key saved here. Replies then use the server&apos;s LLM_* settings, if it has them.</p>
          <Button
            variant="danger"
            className="mt-3"
            disabled={pending}
            onClick={async () => {
              const ok = await askConfirm({
                title: "Remove connection?",
                body: `The ${PROVIDERS[view.provider].label} address, model and saved API key will be deleted. You'll need the key again to reconnect.`,
                confirmLabel: "Remove connection",
                danger: true,
              });
              if (!ok) return;
              run(async () => {
                unwrap(await removeConnection());
                router.refresh();
              });
            }}
          >
            Remove connection
          </Button>
        </section>
      )}
    </div>
  );
}
