import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flashcards: defineTable({
    ukrainian: v.string(),
    english: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_createdAt", ["createdAt"]),
  responses: defineTable({
    flashcardId: v.id("flashcards"),
    userId: v.string(),
    remembered: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_flashcard_user", ["flashcardId", "userId", "createdAt"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
});
