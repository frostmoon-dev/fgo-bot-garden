import "server-only";
import { db } from "@/lib/db";
import { onUsageReport } from "@/lib/llm/usageReport";

// Older records are dropped now and then, so the table stays small.
const KEEP_DAYS = 90;
let lastPrune = 0;

onUsageReport(({ purpose, model, usage }) => {
  void db.usage
    .create({
      data: {
        purpose,
        model: model.slice(0, 200),
        promptTokens: usage?.promptTokens ?? null,
        cachedTokens: usage?.cachedTokens ?? null,
        completionTokens: usage?.completionTokens ?? null,
      },
    })
    .catch((error) => console.error("Could not record token usage", error));
  if (Date.now() - lastPrune > 86_400_000) {
    lastPrune = Date.now();
    void db.usage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } }).catch(() => {});
  }
});
