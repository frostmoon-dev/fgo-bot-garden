export interface LoreEntry {
  id: string;
  title: string;
  keywords: string[];
  content: string;
  enabled: boolean;
}

// Any lorebook source (local DB now, an external service later) implements this.
export interface LoreProvider {
  listEnabled(): Promise<LoreEntry[]>;
}
