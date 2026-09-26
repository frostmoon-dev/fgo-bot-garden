// Appended to the chat stream when generation fails after it started.
export const STREAM_ERROR_MARKER = "\n[[stream-error]] ";
// Appended once the reply is complete: the provider's token counts as JSON (see ChatUsage).
export const STREAM_USAGE_MARKER = "\n[[stream-usage]] ";
