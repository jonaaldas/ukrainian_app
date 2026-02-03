import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@ukrainian_app/convex/convex/_generated/api';
import { useAction, useQuery } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Stack } from 'expo-router';
import { MoonStarIcon, SunIcon, Upload } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

export default function Screen() {
  const { theme } = useUniwind();
  const importCsv = useAction(api.flashcardsCsv.importCsv);
  const flashcards = useQuery(api.flashcards.listFlashcards, {});
  const isLoadingFlashcards = flashcards === undefined;
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [defaultCategory, setDefaultCategory] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<{
    inserted: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Flashcards',
          headerTransparent: true,
          headerRight: () => <HeaderActions onUploadPress={() => setIsUploadOpen(true)} />,
        }}
      />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-24 pt-24">
        <Text className="text-lg font-semibold">All flashcards</Text>
        {isLoadingFlashcards ? (
          <Text className="mt-2 text-sm text-muted-foreground">Loading...</Text>
        ) : flashcards && flashcards.length > 0 ? (
          <View className="mt-4 gap-3">
            {flashcards.map((card) => (
              <View key={card._id} className="rounded-md border border-border bg-card px-4 py-3">
                <Text className="text-sm font-semibold text-foreground">{card.ukrainian}</Text>
                <Text className="text-sm text-muted-foreground">{card.english}</Text>
                {card.category ? (
                  <Text className="mt-1 text-xs text-muted-foreground">{card.category}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-2 text-sm text-muted-foreground">
            No flashcards yet. Upload a CSV to get started.
          </Text>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isUploadOpen}
        onRequestClose={() => setIsUploadOpen(false)}>
        <View className="flex-1 justify-end">
          <Pressable className="flex-1 bg-black/40" onPress={() => setIsUploadOpen(false)} />
          <View className="rounded-t-3xl border border-border bg-card p-5">
            <View className="flex-row items-start justify-between">
              <View className="gap-1">
                <Text className="text-lg font-semibold">Upload CSV</Text>
                <Text className="text-sm text-muted-foreground">
                  Columns: ukrainian, english, category (optional)
                </Text>
              </View>
              <Button variant="ghost" size="icon" onPress={() => setIsUploadOpen(false)}>
                <Text>✕</Text>
              </Button>
            </View>

            <View className="mt-5 gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium">CSV file</Text>
                <Button variant="outline" onPress={pickCsvFile}>
                  <Text>{selectedFile ? selectedFile.name : 'Choose file'}</Text>
                </Button>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium">Default category (optional)</Text>
                <TextInput
                  value={defaultCategory}
                  onChangeText={setDefaultCategory}
                  placeholder="e.g. Basics"
                  placeholderTextColor="#9ca3af"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </View>

              {error ? (
                <View className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <Text className="text-sm text-destructive">{error}</Text>
                </View>
              ) : null}

              {result ? (
                <View className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Text className="text-sm">
                    Imported {result.inserted} rows. Skipped {result.skipped} rows.
                  </Text>
                  {result.errors.length ? (
                    <Text className="text-sm text-destructive">
                      {result.errors.length} parse warnings.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View className="mt-6 flex-row justify-end gap-2">
              <Button variant="outline" onPress={resetModal}>
                <Text>Cancel</Text>
              </Button>
              <Button disabled={isUploading} onPress={uploadCsv}>
                <Text>{isUploading ? 'Uploading...' : 'Upload'}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  async function pickCsvFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    const file = result.assets[0];
    setSelectedFile(file);
  }

  async function uploadCsv() {
    setError('');
    setResult(null);

    if (!selectedFile) {
      setError('Please choose a CSV file.');
      return;
    }

    try {
      setIsUploading(true);
      const csvText = await new File(selectedFile.uri).text();
      const response = await importCsv({
        csvText,
        defaultCategory: defaultCategory.trim() || undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  function resetModal() {
    setIsUploadOpen(false);
    setSelectedFile(null);
    setDefaultCategory('');
    setError('');
    setResult(null);
  }
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { theme } = useUniwind();

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    Uniwind.setTheme(newTheme);
  }

  return (
    <Button
      onPressIn={toggleTheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 web:mx-4 rounded-full">
      <Icon as={THEME_ICONS[theme ?? 'light']} className="size-5" />
    </Button>
  );
}

function HeaderActions({ onUploadPress }: { onUploadPress: () => void }) {
  return (
    <View className="flex-row items-center gap-2 pr-2">
      <Button variant="ghost" size="icon" onPress={onUploadPress} className="rounded-full">
        <Icon as={Upload} className="size-5" />
      </Button>
      <ThemeToggle />
    </View>
  );
}
