import { action } from "./_generated/server";
import { v } from "convex/values";
import Papa from "papaparse";
import { api } from "./_generated/api";

export const importCsv = action({
  args: {
    csvText: v.string(),
    defaultCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parsed = Papa.parse<Record<string, string>>(args.csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const errors: string[] = [];
    if (parsed.errors.length) {
      for (const err of parsed.errors) {
        errors.push(`${err.type}: ${err.message}`);
      }
    }

    const items = [];
    for (const row of parsed.data) {
      const ukrainian = (row.ukrainian ?? "").trim();
      const english = (row.english ?? "").trim();
      const category = (row.category ?? "").trim() || args.defaultCategory;

      if (!ukrainian || !english) {
        continue;
      }

      items.push({
        ukrainian,
        english,
        category,
      });
    }

    if (items.length === 0) {
      return { inserted: 0, skipped: parsed.data.length, errors };
    }

    const result = await ctx.runMutation(api.flashcards.createManyFlashcards, {
      items,
    });

    return {
      inserted: result.count,
      skipped: parsed.data.length - result.count,
      errors,
    };
  },
});
