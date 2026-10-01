"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
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

function StatusLine({ view, slot }: { view: ConnectionView; slot: 1 | 2 }) {
  if (view.source === "none" && slot === 2) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
        No backup model yet. It is optional: when the main model fails even after retrying, the reply comes from this one instead.
        A free model on another provider works well here. Saving sends one tiny test request first, and a backup that doesn&apos;t answer isn&apos;t
        saved.
      </p>
    );
  }
  if (view.source === "none") {
    return (
      <p className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
        Not connected yet. Pick a provider, paste your API key, choose a model, then <strong>Test</strong> and <strong>Save</strong>.
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
      <span className="size-2 rounded-full bg-[var(--success)]" aria-hidden />
      <span>
        {slot === 2 ? "Backup" : "Connected to"} <strong>{PROVIDERS[view.provider].label}</strong> · <span className="font-mono">{view.model}</span>
      </span>
      {view.source === "env" && <span className="text-muted">(from the server&apos;s LLM_* settings; saving here replaces them)</span>}
    </p>
  );
}

// The model box with its own dropdown. Phones (iOS Safari) show a <datalist> only as a few cut-off words above
// the keyboard, so the loaded models are listed here instead: filtered by what is typed, 40px rows, and arrow
// keys, Enter and Esc on a keyboard.
function ModelBox({
  listId,
  value,
  models,
  open,
  setOpen,
  onChange,
}: {
  listId: string;
  value: string;
  models: string[];
  open: boolean;
  setOpen: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const [active, setActive] = useState(-1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = value.trim().toLowerCase();
  // A picked model shows the whole list again, so another can be chosen without clearing the box.
  const shown = !query || models.includes(value) ? models : models.filter((m) => m.toLowerCase().includes(query));
  const visible = open && shown.length > 0;

  const pick = (m: string) => {
    onChange(m);
    setOpen(false);
    setActive(-1);
  };

  return (
    <span className="relative min-w-0 flex-1">
      <TextInput
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
          if (models.length) setOpen(true);
        }}
        // Late enough for a tap on a row to land first.
        onBlur={() => {
          closeTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (!visible) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (i + step + shown.length) % shown.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Model id"
        autoComplete="off"
        spellCheck={false}
        className="font-mono text-sm"
      />
      {visible && (
        <span
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 block max-h-72 overflow-y-auto rounded-[0.625rem] border border-line bg-surface py-1 shadow-lg"
        >
          {shown.map((m, i) => (
            <span
              key={m}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={m === value}
              // Keeps the focus in the box, so it doesn't close before the tap lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                pick(m);
              }}
              className={`flex min-h-10 cursor-pointer items-center break-all px-3.5 py-2 font-mono text-sm ${
                i === active ? "bg-raised" : "hover:bg-raised"
              } ${m === value ? "text-accent" : ""}`}
            >
              {m}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

// slot 1 is the main model, slot 2 the backup.
export function ConnectionForm({ view, slot = 1 }: { view: ConnectionView; slot?: 1 | 2 }) {
  const router = useRouter();
  const listId = useId();
  const [provider, setProvider] = useState<ProviderId>(view.provider);
  const [baseUrl, setBaseUrl] = useState(view.baseUrl || PROVIDERS[view.provider].baseUrl);
  const [model, setModel] = useState(view.model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [tested, setTested] = useState<TestResult | null>(null);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  const preset = PROVIDERS[provider];
  // The saved key is tied to its address: another provider needs its own.
  const keyApplies = view.hasKey && !!origin(baseUrl) && origin(baseUrl) === origin(view.baseUrl);
  const needsKey = !keyApplies && !("keyOptional" in preset && preset.keyOptional) && !apiKey.trim();
  const input = { provider, baseUrl, model, apiKey, slot };

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
      <StatusLine view={view} slot={slot} />

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
              className="min-w-0 flex-1 font-mono text-sm"
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
            <ModelBox
              listId={listId}
              value={model}
              models={models}
              open={listOpen}
              setOpen={setListOpen}
              onChange={(value) => {
                changed();
                setModel(value);
              }}
            />
            <Button
              className="shrink-0"
              disabled={pending || !baseUrl.trim()}
              onClick={() =>
                run(async () => {
                  const list = unwrap(await listModels({ provider, baseUrl, apiKey, slot }));
                  setModels(list);
                  if (!model.trim() && list.length === 1) setModel(list[0]);
                  setListOpen(list.length > 1);
                })
              }
            >
              Load models
            </Button>
          </span>
        </Label>
        {models.length > 0 && (
          <p className="mt-2 text-sm text-muted">{models.length} models found. Tap the model box to pick one, or type to filter them.</p>
        )}
      </div>

      <p className="text-sm text-muted">
        Each model writes differently. After connecting, tune the prompt style, context size and reply length under{" "}
        <a href="/settings" className="text-accent hover:underline">
          Settings → AI model
        </a>
        .
      </p>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-canvas py-4">
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
          {pending ? (slot === 2 ? "Testing and saving…" : "Working…") : slot === 2 ? "Test and save backup" : "Save connection"}
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
            <span className="text-[var(--success)]">Works</span> · answered in {(tested.ms / 1000).toFixed(1)} s{tested.reply && <> · “{tested.reply}”</>}
          </span>
        )}
        {saved && !tested && (
          <span className="text-sm text-muted">
            {slot === 2 ? "Saved. Replies switch to this model when the main one fails." : "Saved. New replies use this model."}
          </span>
        )}
      </div>
      <ErrorText error={error} />

      {view.source === "app" && (
        <section className="border-t border-line pt-8">
          <h2 className="text-sm font-medium">{slot === 2 ? "Remove the backup model" : "Remove the saved connection"}</h2>
          <p className="mt-1 text-sm text-muted">
            {slot === 2
              ? "Deletes the backup's address, model and API key. Failed replies then show an error instead."
              : "Deletes the address, model and API key saved here. Replies then use the server's LLM_* settings, if it has them."}
          </p>
          <Button
            variant="danger"
            className="mt-3"
            disabled={pending}
            onClick={async () => {
              const ok = await askConfirm({
                title: slot === 2 ? "Remove the backup model?" : "Remove connection?",
                body: `The ${PROVIDERS[view.provider].label} address, model and saved API key will be deleted. You'll need the key again to reconnect.`,
                confirmLabel: slot === 2 ? "Remove backup" : "Remove connection",
                danger: true,
              });
              if (!ok) return;
              run(async () => {
                unwrap(await removeConnection(slot));
                router.refresh();
              });
            }}
          >
            {slot === 2 ? "Remove backup" : "Remove connection"}
          </Button>
        </section>
      )}
    </div>
  );
}
