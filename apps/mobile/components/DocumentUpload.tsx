import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";
import ConfirmSheet from "@/components/ConfirmSheet";
import FormField from "@/components/FormField";
import {
  deleteDocument,
  type PickedFile,
  type UploadMeta,
  UPLOADABLE_DOC_TYPES,
  uploadDocument,
} from "@/lib/api-documents";
import type { MobileProfile } from "@/lib/api-profile";
import { pickDocumentFile, pickImageFile } from "@/lib/pick-document";

// Validation for the expiry-doc metadata. Insurer + cover are optional (RTW docs
// don't show them); when given, cover must be a plain number and expiry must be a
// real YYYY-MM-DD date. Empty strings are allowed (optional), so we guard format
// only when there's a value.
const metaSchema = z.object({
  insurer: z.string(),
  coverLimit: z
    .string()
    .refine((v) => v === "" || /^\d+$/.test(v.trim()), "Numbers only (e.g. 1000000)"),
  expiresAt: z
    .string()
    .refine(
      (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v.trim()),
      "Use YYYY-MM-DD",
    )
    .refine(
      (v) => v === "" || !Number.isNaN(Date.parse(v.trim())),
      "Not a real date",
    ),
});

// Per-doc-type upload control on the verified profile. Each compliance-pack type
// is a row: shows on-file/expiry when present, and an Add/Replace action that
// picks a file (PDF/image), optionally collects insurer+cover+expiry for
// expiry-tracking types, uploads via the bearer-auth route, and refreshes the
// profile. The server validates + recomputes the trust tier.
const DocumentUpload = ({ profile }: { profile: MobileProfile }) => {
  const onFile = new Map(profile.documents.map((d) => [d.type, d]));

  return (
    <View className="mt-5">
      <Text className="mb-2 text-xs font-sans-semibold uppercase tracking-wide text-muted-foreground">
        Add to your pack
      </Text>
      <Text className="mb-3 text-xs text-muted-foreground">
        Upload a PDF or photo of each document. We hold the file as a checkable
        fact — never a claim about IR35 status.
      </Text>
      {UPLOADABLE_DOC_TYPES.map((dt) => (
        <DocRow
          key={dt.type}
          docType={dt.type}
          label={dt.label}
          tracksExpiry={dt.tracksExpiry}
          hasFile={onFile.has(dt.type)}
        />
      ))}
    </View>
  );
};

const DocRow = ({
  docType,
  label,
  tracksExpiry,
  hasFile,
}: {
  docType: string;
  label: string;
  tracksExpiry: boolean;
  hasFile: boolean;
}) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [picked, setPicked] = useState<PickedFile | null>(null);

  const upload = useMutation({
    mutationFn: ({ file, meta }: { file: PickedFile; meta?: UploadMeta }) =>
      uploadDocument(docType, file, meta),
    onSuccess: () => {
      toast.success(`${label} uploaded.`);
      setExpanded(false);
      setPicked(null);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        (e instanceof Error ? e.message : "Upload failed.");
      toast.error(msg);
    },
  });

  // Metadata form for expiry-tracking docs (insurer / cover / expiry). Validated
  // with zod on change; submit fires the upload with the picked file + trimmed
  // values. Non-expiry docs skip this entirely and upload immediately on pick.
  const form = useForm({
    defaultValues: { insurer: "", coverLimit: "", expiresAt: "" },
    validators: { onChange: metaSchema },
    onSubmit: ({ value }) => {
      if (!picked) return;
      const meta: UploadMeta = {
        insurer: value.insurer.trim() || undefined,
        coverLimit: value.coverLimit.trim() || undefined,
        expiresAt: value.expiresAt.trim() || undefined,
      };
      upload.mutate({ file: picked, meta });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteDocument(docType),
    onSuccess: () => {
      toast.success(`${label} removed.`);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Couldn’t remove — try again."),
  });

  const choose = async (kind: "file" | "photo") => {
    try {
      const file =
        kind === "file" ? await pickDocumentFile() : await pickImageFile();
      if (!file) return;
      setPicked(file);
      // Non-expiry docs upload immediately; expiry docs wait for the metadata.
      if (!tracksExpiry) upload.mutate({ file });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t pick that file.");
    }
  };

  const confirmRemove = () => setConfirmOpen(true);

  // Toggle the expiry form; clear any picked file + metadata when collapsing so a
  // stale selection can't carry into the next time the row is opened.
  const toggleExpiry = () =>
    setExpanded((open) => {
      if (open) {
        setPicked(null);
        form.reset();
      }
      return !open;
    });

  const busy = upload.isPending || remove.isPending;

  return (
    <>
      <View className="mb-2 rounded-lg border border-border bg-card p-3">
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="font-sans-semibold text-foreground">{label}</Text>
          <Text className="text-xs text-muted-foreground">
            {hasFile ? "On file" : "Not provided"}
          </Text>
        </View>
        <View className="flex-row gap-2">
          {hasFile ? (
            <Pressable
              className="rounded-lg px-3 py-2 active:opacity-70"
              disabled={busy}
              onPress={confirmRemove}
            >
              <Text className="text-sm text-destructive">Remove</Text>
            </Pressable>
          ) : null}
          <Pressable
            className="rounded-lg border border-border px-3 py-2 active:opacity-70"
            disabled={busy}
            onPress={() => {
              if (tracksExpiry) toggleExpiry();
              else choose("file");
            }}
          >
            {busy ? (
              <ActivityIndicator color="#17181a" size="small" />
            ) : (
              <Text className="text-sm text-foreground">
                {hasFile ? "Replace" : "Add"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {expanded && tracksExpiry ? (
        <View className="mt-3 gap-2">
          {docType !== "RIGHT_TO_WORK" ? (
            <>
              <form.Field name="insurer">
                {(field) => (
                  <FormField
                    field={field}
                    label="Insurer"
                    placeholder="e.g. Qdos, Markel"
                  />
                )}
              </form.Field>
              <form.Field name="coverLimit">
                {(field) => (
                  <FormField
                    field={field}
                    label="Cover limit (£)"
                    placeholder="e.g. 1000000"
                    keyboardType="number-pad"
                  />
                )}
              </form.Field>
            </>
          ) : null}
          <form.Field name="expiresAt">
            {(field) => (
              <FormField
                field={field}
                label="Expiry date"
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            )}
          </form.Field>
          {picked ? (
            <Text className="text-xs text-muted-foreground">
              Selected: {picked.name}
            </Text>
          ) : null}
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 rounded-lg border border-border px-3 py-2 active:opacity-70"
              disabled={busy}
              onPress={() => choose("file")}
            >
              <Text className="text-center text-sm text-foreground">
                Choose file
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-lg border border-border px-3 py-2 active:opacity-70"
              disabled={busy}
              onPress={() => choose("photo")}
            >
              <Text className="text-center text-sm text-foreground">
                Take/choose photo
              </Text>
            </Pressable>
          </View>
          <form.Subscribe selector={(s) => s.canSubmit}>
            {(canSubmit) => (
              <Pressable
                className={`rounded-lg p-3 ${picked && canSubmit ? "bg-primary active:opacity-90" : "bg-ink-300"}`}
                disabled={!picked || !canSubmit || busy}
                onPress={() => void form.handleSubmit()}
              >
                {upload.isPending ? (
                  <ActivityIndicator color="#fbfaf9" size="small" />
                ) : (
                  <Text className="text-center font-sans-semibold text-primary-foreground">
                    Upload
                  </Text>
                )}
              </Pressable>
            )}
          </form.Subscribe>
        </View>
      ) : null}
      </View>
      <ConfirmSheet
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Remove document"
        description={`Remove your ${label}? You can upload it again any time.`}
        confirmLabel="Remove"
        onConfirm={() => remove.mutate()}
      />
    </>
  );
};

export default DocumentUpload;
