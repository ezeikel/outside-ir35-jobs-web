import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type PickedFile,
} from "@/lib/api-documents";

// Pick a compliance document — a PDF/image via the document picker, or a photo
// from the library — and validate it against the same MIME + size rules the
// server enforces, so we fail fast on device. Returns null if the user cancels;
// throws a human-readable Error if the picked file is the wrong type/too big.

const isAllowed = (mime: string): boolean =>
  (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);

const guessMimeFromName = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
};

const validate = (file: PickedFile): PickedFile => {
  if (!isAllowed(file.mimeType)) {
    throw new Error("Please choose a PDF, PNG, JPEG or WebP file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That file is over the 10 MB limit.");
  }
  return file;
};

/** Pick a PDF or image file from the device's files. */
export const pickDocumentFile = async (): Promise<PickedFile | null> => {
  const res = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_MIME_TYPES as unknown as string[],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return validate({
    uri: a.uri,
    name: a.name ?? "document",
    mimeType: a.mimeType ?? guessMimeFromName(a.name ?? ""),
    size: a.size ?? 0,
  });
};

/** Pick a photo from the library (a scan/photo of a certificate). */
export const pickImageFile = async (): Promise<PickedFile | null> => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Photo access is needed to choose an image.");
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
    allowsMultipleSelection: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const name = a.fileName ?? `photo-${a.assetId ?? "upload"}.jpg`;
  return validate({
    uri: a.uri,
    name,
    mimeType: a.mimeType ?? guessMimeFromName(name),
    size: a.fileSize ?? 0,
  });
};
