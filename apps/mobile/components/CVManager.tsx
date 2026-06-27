import { faCheck, faFileLines, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { toast } from "sonner-native";
import ConfirmSheet from "@/components/ConfirmSheet";
import {
  type CV,
  deleteCV,
  fetchCVs,
  renameCV,
  setActiveCV,
  uploadCV,
} from "@/lib/api-cvs";
import { pickDocumentFile } from "@/lib/pick-document";

// Named, multi-version CVs. A contractor keeps several CVs tailored to different
// role-types; the ACTIVE one drives job matching + the pitch shown to posters.
// Add (name + file pick), set-active, delete. Parsing happens server-side; we show
// a "Reading…" hint until parsed.

export const CV_QUERY_KEY = ["cvs"] as const;

// Default CV name from the picked file (strip the extension). The user can rename
// it after — naming up-front in a bottom sheet was fragile (the keyboard hid the
// sheet), so we pick the file first and name from it.
const nameFromFile = (filename: string): string => {
  const base = filename.replace(/\.[^./\\]+$/, "").trim();
  return base.slice(0, 60) || "My CV";
};

const CVManager = () => {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{ name: string } | null>(null);
  const [toDelete, setToDelete] = useState<CV | null>(null);

  const { data: cvs = [], isLoading } = useQuery({
    queryKey: CV_QUERY_KEY,
    queryFn: fetchCVs,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: CV_QUERY_KEY });
    // The active CV drives the profile (parsedProfile) — refresh that too.
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  // Tap Add CV → open the file picker straight away → upload, named from the file.
  const upload = useMutation({
    mutationFn: async () => {
      const file = await pickDocumentFile();
      if (!file) return null; // user cancelled the picker
      const cvName = nameFromFile(file.name);
      setPending({ name: cvName });
      return uploadCV(cvName, file);
    },
    onSuccess: (cv) => {
      if (cv) {
        toast.success("CV added. We’re reading it now.");
        invalidate();
      }
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? (e instanceof Error ? e.message : "Couldn’t add the CV.");
      toast.error(msg);
    },
    onSettled: () => setPending(null),
  });

  const activate = useMutation({
    mutationFn: (id: string) => setActiveCV(id),
    onSuccess: () => {
      toast.success("Active CV updated.");
      invalidate();
    },
    onError: () => toast.error("Couldn’t switch CV. Try again."),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameCV(id, name),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Couldn’t rename. Try again."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCV(id),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Couldn’t delete the CV. Try again."),
  });

  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-xl text-foreground">Your CVs</Text>
        <Pressable
          className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-2 active:opacity-90"
          onPress={() => upload.mutate()}
          disabled={upload.isPending}
          accessibilityRole="button"
          accessibilityLabel="Add a CV"
        >
          <FontAwesomeIcon icon={faPlus} size={12} color="#fbfaf9" />
          <Text className="text-sm font-sans-semibold text-primary-foreground">
            Add CV
          </Text>
        </Pressable>
      </View>
      <Text className="mt-1 text-xs text-muted-foreground">
        Keep a CV per role-type. Your active CV is used to match you to contracts.
      </Text>

      {isLoading ? (
        <View className="py-6">
          <ActivityIndicator color="#17181a" />
        </View>
      ) : cvs.length === 0 && !pending ? (
        <View className="mt-3 rounded-lg border border-dashed border-border bg-card/50 p-5">
          <Text className="text-center text-sm text-muted-foreground">
            No CVs yet. Add one to power job matching and a tailored pitch.
          </Text>
        </View>
      ) : (
        <View className="mt-3 gap-2">
          {/* Optimistic "uploading" row while the picker + upload run. */}
          {pending ? (
            <View className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-3 opacity-70">
              <ActivityIndicator color="#a3a09e" />
              <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                {pending.name}
              </Text>
              <Text className="text-xs text-muted-foreground">Uploading…</Text>
            </View>
          ) : null}

          {cvs.map((cv) => (
            <CVRow
              key={cv.id}
              cv={cv}
              onActivate={() => activate.mutate(cv.id)}
              onRename={(name) => rename.mutate({ id: cv.id, name })}
              onDelete={() => setToDelete(cv)}
              busy={activate.isPending || remove.isPending}
            />
          ))}
        </View>
      )}


      <ConfirmSheet
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={`Delete “${toDelete?.name ?? "CV"}”?`}
        description="This removes the CV and its parsed profile. If it’s your active CV, another will take over matching."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) {
            void Haptics.selectionAsync();
            remove.mutate(toDelete.id);
          }
        }}
      />
    </View>
  );
};

const CVRow = ({
  cv,
  onActivate,
  onRename,
  onDelete,
  busy,
}: {
  cv: CV;
  onActivate: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  busy: boolean;
}) => {
  // Inline rename — an in-flow TextInput (no bottom sheet, so the keyboard pushes
  // the scroll naturally and never hides the field).
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cv.name);

  const commit = () => {
    const next = draft.trim().slice(0, 60);
    setEditing(false);
    if (next && next !== cv.name) onRename(next);
    else setDraft(cv.name);
  };

  return (
    <View className="rounded-lg border border-border bg-card p-3">
      <View className="flex-row items-center gap-3">
        <FontAwesomeIcon icon={faFileLines} size={18} color="#767370" />
        <View className="min-w-0 flex-1">
          {editing ? (
            <TextInput
              style={styles.renameInput}
              value={draft}
              onChangeText={setDraft}
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={commit}
              onBlur={commit}
              accessibilityLabel="CV name"
            />
          ) : (
            <Pressable
              onPress={() => {
                setDraft(cv.name);
                setEditing(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Rename ${cv.name}`}
            >
              <Text
                className="text-sm font-sans-semibold text-foreground"
                numberOfLines={1}
              >
                {cv.name}
              </Text>
            </Pressable>
          )}
          <Text className="text-xs text-muted-foreground">
            {cv.parsed ? "Ready" : "Reading…"}
            {cv.isActive ? " · used for matching" : ""}
          </Text>
        </View>
        {cv.isActive ? (
          <View className="flex-row items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <FontAwesomeIcon icon={faCheck} size={10} color="#17181a" />
            <Text className="text-xs font-sans-medium text-secondary-foreground">
              Active
            </Text>
          </View>
        ) : (
          <Pressable
            className="rounded-lg border border-border px-3 py-1.5 active:opacity-70"
            onPress={onActivate}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Make ${cv.name} the active CV`}
          >
            <Text className="text-xs font-sans-medium text-foreground">
              Use this
            </Text>
          </Pressable>
        )}
      </View>
      <View className="mt-2 flex-row gap-4">
        <Pressable
          className="active:opacity-60"
          hitSlop={6}
          onPress={() => {
            setDraft(cv.name);
            setEditing(true);
          }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Rename ${cv.name}`}
        >
          <Text className="text-xs text-muted-foreground">Rename</Text>
        </Pressable>
        <Pressable
          className="active:opacity-60"
          hitSlop={6}
          onPress={onDelete}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${cv.name}`}
        >
          <Text className="text-xs text-destructive">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  renameInput: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 14,
    color: "#17181a",
    borderBottomWidth: 1,
    borderBottomColor: "#17181a",
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
});

export default CVManager;
