import { faShareNodes, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import Pdf from "react-native-pdf";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A full-screen, in-app document viewer (VIEW-ONLY). Renders a PDF natively
// (react-native-pdf: pinch-zoom, page swipe, thumbnails) or an image
// (expo-image). Used for CVs AND compliance documents.
//
// IMPORTANT: editing is deliberately NOT offered. Compliance documents are
// third-party-issued evidence; the trust model depends on them being unaltered
// originals, so they are view-only by design (docs/ir35-trust-model.md). CVs are
// "edited" by re-uploading a new file. This component only ever displays.

type DocViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  // Short-lived presigned URL to the file (PDF or image).
  url: string | null;
  title: string;
  // Drives the renderer. Falls back to PDF when unknown (the common case).
  kind?: "pdf" | "image";
};

const DocViewer = ({ isOpen, onClose, url, title, kind }: DocViewerProps) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isImage = kind === "image";

  const share = async () => {
    if (!url) return;
    try {
      await Share.share({ url, title });
    } catch {
      // user cancelled / unsupported — no-op
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {/* Our own header — title, Done, share. */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close document"
          >
            <FontAwesomeIcon icon={faXmark} size={18} color="#17181a" />
          </Pressable>
          <Text
            className="mx-3 flex-1 text-center font-sans-semibold text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
            onPress={share}
            accessibilityRole="button"
            accessibilityLabel="Share document"
          >
            <FontAwesomeIcon icon={faShareNodes} size={17} color="#17181a" />
          </Pressable>
        </View>

        <View className="flex-1" style={{ paddingBottom: insets.bottom }}>
          {!url ? (
            <Centered>
              <ActivityIndicator color="#17181a" />
            </Centered>
          ) : error ? (
            <Centered>
              <Text className="text-center text-sm text-muted-foreground">
                Couldn’t display this document. Try again.
              </Text>
            </Centered>
          ) : isImage ? (
            <Image
              source={{ uri: url }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={150}
              onLoadEnd={() => setLoading(false)}
              onError={() => setError(true)}
            />
          ) : (
            <Pdf
              source={{ uri: url, cache: true }}
              trustAllCerts={false}
              style={{ flex: 1, backgroundColor: "#f6f5f3" }}
              onLoadComplete={() => setLoading(false)}
              onError={() => setError(true)}
              renderActivityIndicator={() => (
                <ActivityIndicator color="#17181a" />
              )}
            />
          )}

          {/* Image spinner overlay (PDF has its own). */}
          {url && isImage && loading && !error ? (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator color="#17181a" />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const Centered = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-1 items-center justify-center px-8">{children}</View>
);

export default DocViewer;
