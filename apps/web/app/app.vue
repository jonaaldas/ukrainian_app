<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="fixed right-4 top-4 z-40 flex items-center gap-2">
      <ThemeToggle />
      <Button @click="openModal">Upload CSV</Button>
    </div>

    <div class="mx-auto max-w-3xl px-6 py-16">
      <h1 class="text-3xl font-semibold tracking-tight">Ukrainian Flashcards</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Upload a CSV to bulk import flashcards into Convex.
      </p>

      <div class="mt-8">
        <h2 class="text-lg font-semibold">All flashcards</h2>
        <p v-if="isPending" class="mt-2 text-sm text-muted-foreground">Loading...</p>
        <p v-else-if="listError" class="mt-2 text-sm text-destructive">
          {{ listError.message ?? 'Failed to load flashcards.' }}
        </p>
        <ul v-else class="mt-4 space-y-2">
          <li
            v-for="card in flashcards"
            :key="card._id"
            class="rounded-md border border-border bg-card px-4 py-3 text-sm">
            <div class="font-medium text-foreground">{{ card.ukrainian }}</div>
            <div class="text-muted-foreground">{{ card.english }}</div>
            <div v-if="card.category" class="mt-1 text-xs text-muted-foreground">
              {{ card.category }}
            </div>
          </li>
        </ul>
        <p v-if="!isPending && !listError && flashcards.length === 0" class="mt-4 text-sm text-muted-foreground">
          No flashcards yet. Upload a CSV to get started.
        </p>
      </div>
    </div>

    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-start justify-center px-4 py-16">
      <div class="absolute inset-0 bg-black/40" @click="closeModal"></div>
      <div class="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold">Upload CSV</h2>
            <p class="text-sm text-muted-foreground">
              Columns: ukrainian, english, category (optional)
            </p>
          </div>
          <Button variant="outline" size="sm" @click="closeModal">Close</Button>
        </div>

        <div class="mt-6 space-y-4">
          <label class="block text-sm font-medium">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            @change="onFileChange"
          />

          <label class="block text-sm font-medium">Default category (optional)</label>
          <input
            v-model="defaultCategory"
            type="text"
            placeholder="e.g. Basics"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <div v-if="uploadError" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ uploadError }}
          </div>

          <div v-if="result" class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            Imported {{ result.inserted }} rows. Skipped {{ result.skipped }} rows.
            <span v-if="result.errors.length" class="block text-destructive">
              {{ result.errors.length }} parse warnings.
            </span>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" @click="closeModal">Cancel</Button>
          <Button :disabled="isUploading" @click="uploadCsv">
            {{ isUploading ? "Uploading..." : "Upload" }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import ThemeToggle from './components/toggle.vue';
import { Button } from '@/components/ui/button';
import { api } from '@ukrainian_app/convex/convex/_generated/api';
import { computed, ref } from 'vue';

const convex = useConvexClient();
const { data, error: listError, isPending } = useConvexQuery(api.flashcards.listFlashcards, {});
const flashcards = computed(() => data.value ?? []);
const isOpen = ref(false);
const selectedFile = ref<File | null>(null);
const defaultCategory = ref('');
const isUploading = ref(false);
const uploadError = ref('');
const result = ref<{ inserted: number; skipped: number; errors: string[] } | null>(null);

function openModal() {
  isOpen.value = true;
  uploadError.value = '';
  result.value = null;
}

function closeModal() {
  isOpen.value = false;
  selectedFile.value = null;
  uploadError.value = '';
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

async function uploadCsv() {
  uploadError.value = '';
  result.value = null;

  if (!selectedFile.value) {
    uploadError.value = 'Please choose a CSV file.';
    return;
  }

  try {
    isUploading.value = true;
    const csvText = await selectedFile.value.text();
    const response = await convex.action(api.flashcardsCsv.importCsv, {
      csvText,
      defaultCategory: defaultCategory.value.trim() || undefined,
    });
    result.value = response;
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed.';
  } finally {
    isUploading.value = false;
  }
}
</script>
