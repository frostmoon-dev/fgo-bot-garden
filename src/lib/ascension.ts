// An ascension is one sprite sheet plus its own definition. Every definition field an ascension
// leaves empty falls back to the character's profile, so an ascension only has to describe what changes.

export const PROFILE_FIELDS = [
  "description",
  "personality",
  "speechStyle",
  "lore",
  "relationship",
  "scenario",
  "greeting",
  "exampleDialogues",
  "openingScene",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type AscensionProfile = Record<ProfileField, string>;

export function resolveProfile(base: AscensionProfile, ascension?: Partial<AscensionProfile> | null): AscensionProfile {
  const out = { ...base };
  if (!ascension) return out;
  for (const field of PROFILE_FIELDS) {
    const value = ascension[field];
    if (value?.trim()) out[field] = value;
  }
  return out;
}

export function pickProfile<T extends AscensionProfile>(row: T): AscensionProfile {
  return Object.fromEntries(PROFILE_FIELDS.map((f) => [f, row[f] ?? ""])) as AscensionProfile;
}

// The ascension used for a character: the one chosen for the story, then the default, then the first.
export function pickAscension<S extends { id: string }>(
  character: { defaultSpriteSetId: string | null; spriteSets: S[] },
  chosenId?: string | null,
): S | null {
  return (
    character.spriteSets.find((s) => s.id === chosenId) ??
    character.spriteSets.find((s) => s.id === character.defaultSpriteSetId) ??
    character.spriteSets[0] ??
    null
  );
}

// Only offer the model faces the ascension can show. Without a sheet, every expression counts.
export function availableExpressions<E extends { key: string }>(expressions: E[], faces: Record<string, number> | null): E[] {
  if (!faces) return expressions;
  return expressions.filter((e) => e.key === "neutral" || faces[e.key] !== undefined);
}
