// Rough estimate: about 3.5 characters per token for English text. Good enough for budgeting.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
