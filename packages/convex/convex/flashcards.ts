import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const GLOBAL_USER_ID = "global";

export const createFlashcard = mutation({
  args: {
    ukrainian: v.string(),
    english: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("flashcards", {
      ukrainian: args.ukrainian,
      english: args.english,
      category: args.category,
      tags: args.tags,
      createdAt: now,
    });
    return id;
  },
});

export const createManyFlashcards = mutation({
  args: {
    items: v.array(
      v.object({
        ukrainian: v.string(),
        english: v.string(),
        category: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: Id<"flashcards">[] = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("flashcards", {
        ukrainian: item.ukrainian,
        english: item.english,
        category: item.category,
        tags: item.tags,
        createdAt: now,
      });
      ids.push(id);
    }
    return { count: ids.length, ids };
  },
});

export const updateFlashcard = mutation({
  args: {
    id: v.id("flashcards"),
    ukrainian: v.optional(v.string()),
    english: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const deleteFlashcard = mutation({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const deleteFlashcards = mutation({
  args: { ids: v.array(v.id("flashcards")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
    return { count: args.ids.length };
  },
});

export const recordResponse = mutation({
  args: {
    flashcardId: v.id("flashcards"),
    remembered: v.boolean(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("responses", {
      flashcardId: args.flashcardId,
      remembered: args.remembered,
      userId: args.userId ?? GLOBAL_USER_ID,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const resetProgress = mutation({
  args: {
    flashcardId: v.optional(v.id("flashcards")),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? GLOBAL_USER_ID;
    if (args.flashcardId) {
      const responses = await ctx.db
        .query("responses")
        .withIndex("by_flashcard_user", (q) =>
          q.eq("flashcardId", args.flashcardId!).eq("userId", userId),
        )
        .collect();
      for (const response of responses) {
        await ctx.db.delete(response._id);
      }
      return { count: responses.length };
    }
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
      .collect();
    for (const response of responses) {
      await ctx.db.delete(response._id);
    }
    return { count: responses.length };
  },
});

export const getFlashcard = query({
  args: { id: v.id("flashcards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listFlashcards = query({
  args: {
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("remembered"), v.literal("notRemembered"), v.literal("unseen"))),
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? GLOBAL_USER_ID;
    let flashcards = args.category
      ? await ctx.db
          .query("flashcards")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect()
      : await ctx.db.query("flashcards").collect();

    if (!args.status) {
      if (args.limit !== undefined) {
        flashcards = flashcards.slice(0, args.limit);
      }
      return flashcards;
    }

    const results = [];
    for (const card of flashcards) {
      const last = await ctx.db
        .query("responses")
        .withIndex("by_flashcard_user", (q) =>
          q.eq("flashcardId", card._id).eq("userId", userId),
        )
        .order("desc")
        .first();

      const status =
        last === null
          ? "unseen"
          : last.remembered
            ? "remembered"
            : "notRemembered";

      if (status === args.status) {
        results.push(card);
        if (args.limit !== undefined && results.length >= args.limit) {
          break;
        }
      }
    }
    return results;
  },
});

export const getFlashcardProgress = query({
  args: {
    flashcardId: v.id("flashcards"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? GLOBAL_USER_ID;
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_flashcard_user", (q) =>
        q.eq("flashcardId", args.flashcardId).eq("userId", userId),
      )
      .collect();

    let yesCount = 0;
    let noCount = 0;
    for (const r of responses) {
      if (r.remembered) yesCount += 1;
      else noCount += 1;
    }

    const last = await ctx.db
      .query("responses")
      .withIndex("by_flashcard_user", (q) =>
        q.eq("flashcardId", args.flashcardId).eq("userId", userId),
      )
      .order("desc")
      .first();

    return {
      yesCount,
      noCount,
      total: responses.length,
      lastResponse: last,
    };
  },
});
