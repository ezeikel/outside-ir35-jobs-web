import {
  faBold,
  faItalic,
  faLink,
  faListOl,
  faListUl,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
} from "react-native-enriched";

// Brand-styled rich-text field built on react-native-enriched (Swmansion's
// fully-native editor — no webview). Produces HTML via onChangeHtml that
// round-trips with the web TipTap output, so a description authored on mobile
// renders/edits on web and vice-versa. The toolbar mirrors the web TipTap controls
// the job form exposes: bold, italic, H1, H2, bullet + numbered lists, and links.
// (Web also has indent/outdent + undo/redo, which Enriched has no ref API for, so
// those are intentionally omitted — no other web control is missing.) The editor
// is uncontrolled (the native view owns its value); `defaultValue` seeds it once
// and onChangeHtml streams the HTML out to the form.

const ACTIVE = "#17181a";
const INACTIVE = "#a3a09e";

type RichTextFieldProps = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onChangeHtml: (html: string) => void;
  error?: string | null;
};

// A toolbar control: either an icon button or a short text label ("H1"/"H2").
const ToolbarButton = ({
  icon,
  text,
  isActive,
  onPress,
  a11y,
}: {
  icon?: typeof faBold;
  text?: string;
  isActive: boolean;
  onPress: () => void;
  a11y: string;
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.toolBtn,
      isActive && styles.toolBtnActive,
      pressed && styles.pressed,
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={a11y}
    accessibilityState={{ selected: isActive }}
  >
    {icon ? (
      <FontAwesomeIcon
        icon={icon}
        size={16}
        color={isActive ? ACTIVE : INACTIVE}
      />
    ) : (
      <Text
        style={[styles.toolText, { color: isActive ? ACTIVE : INACTIVE }]}
      >
        {text}
      </Text>
    )}
  </Pressable>
);

const RichTextField = ({
  label,
  placeholder,
  defaultValue,
  onChangeHtml,
  error,
}: RichTextFieldProps) => {
  const insets = useSafeAreaInsets();
  const ref = useRef<EnrichedTextInputInstance>(null);
  // Track which formats are active in the current selection to highlight the
  // toolbar buttons (onChangeState reports this from the native side).
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    ul: false,
    ol: false,
    h1: false,
    h2: false,
    link: false,
  });
  // The live selection range + text, so the link button knows what to wrap.
  const selection = useRef({ start: 0, end: 0, text: "" });
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Tapping the link button: if the cursor is in an existing link, remove it;
  // otherwise (text selected) open the URL sheet to wrap the selection.
  const onLinkPress = () => {
    const { start, end } = selection.current;
    if (active.link) {
      ref.current?.removeLink(start, end);
      return;
    }
    if (end <= start) return; // nothing selected — a link needs a target range
    setLinkUrl("");
    setLinkSheetOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    const { start, end, text } = selection.current;
    if (url && end > start) {
      // Enriched stores the visible text + href; pass the selected text so the
      // link label is what the user highlighted.
      ref.current?.setLink(start, end, text, url);
    }
    setLinkSheetOpen(false);
    setLinkUrl("");
  };

  return (
    <View className="gap-2">
      <Text className="text-xs font-sans-medium text-muted-foreground">
        {label}
      </Text>

      <View
        className={`rounded-lg border bg-background ${error ? "border-destructive" : "border-border"}`}
      >
        {/* Formatting toolbar — mirrors the web TipTap controls. */}
        <View style={styles.toolbar}>
          <ToolbarButton
            icon={faBold}
            isActive={active.bold}
            onPress={() => ref.current?.toggleBold()}
            a11y="Bold"
          />
          <ToolbarButton
            icon={faItalic}
            isActive={active.italic}
            onPress={() => ref.current?.toggleItalic()}
            a11y="Italic"
          />
          <View style={styles.divider} />
          <ToolbarButton
            text="H1"
            isActive={active.h1}
            onPress={() => ref.current?.toggleH1()}
            a11y="Heading 1"
          />
          <ToolbarButton
            text="H2"
            isActive={active.h2}
            onPress={() => ref.current?.toggleH2()}
            a11y="Heading 2"
          />
          <View style={styles.divider} />
          <ToolbarButton
            icon={faListUl}
            isActive={active.ul}
            onPress={() => ref.current?.toggleUnorderedList()}
            a11y="Bullet list"
          />
          <ToolbarButton
            icon={faListOl}
            isActive={active.ol}
            onPress={() => ref.current?.toggleOrderedList()}
            a11y="Numbered list"
          />
          <View style={styles.divider} />
          <ToolbarButton
            icon={faLink}
            isActive={active.link}
            onPress={onLinkPress}
            a11y={active.link ? "Remove link" : "Add link"}
          />
        </View>

        <EnrichedTextInput
          ref={ref}
          defaultValue={defaultValue}
          placeholder={placeholder}
          placeholderTextColor="#a3a09e"
          style={styles.input}
          onChangeHtml={(e) => onChangeHtml(e.nativeEvent.value)}
          onChangeSelection={(e) => {
            const s = e.nativeEvent;
            selection.current = { start: s.start, end: s.end, text: s.text };
          }}
          onChangeState={(e) => {
            const s = e.nativeEvent;
            setActive({
              bold: s.bold.isActive,
              italic: s.italic.isActive,
              ul: s.unorderedList.isActive,
              ol: s.orderedList.isActive,
              h1: s.h1.isActive,
              h2: s.h2.isActive,
              link: s.link.isActive,
            });
          }}
        />
      </View>

      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : null}

      {/* Link URL entry — a small bottom sheet (no Alert.prompt per the app's
          rule). Only mounted while open. */}
      {linkSheetOpen ? (
        <ModalBottomSheet
          index={1}
          onIndexChange={(i) => {
            if (i === 0) setLinkSheetOpen(false);
          }}
          scrimColor="rgba(0, 0, 0, 0.5)"
        >
          <View style={styles.linkSheet}>
            <View style={styles.handle} />
            <View
              style={[
                styles.linkContent,
                { paddingBottom: insets.bottom + 24 },
              ]}
            >
              <Text style={styles.linkTitle}>Add a link</Text>
              <TextInput
                style={styles.linkInput}
                placeholder="https://example.com"
                placeholderTextColor="#a3a09e"
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus
                onSubmitEditing={applyLink}
                returnKeyType="done"
              />
              <View style={styles.linkActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.linkButton,
                    styles.linkCancel,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setLinkSheetOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.linkCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.linkButton,
                    styles.linkApply,
                    pressed && styles.pressed,
                  ]}
                  onPress={applyLink}
                  accessibilityRole="button"
                  accessibilityLabel="Add link"
                >
                  <Text style={styles.linkApplyText}>Add link</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ModalBottomSheet>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e7e5",
  },
  toolBtn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: "#f6f5f4",
  },
  toolText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 13,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: "#e8e7e5",
    marginHorizontal: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  input: {
    minHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#17181a",
    fontSize: 15,
  },
  linkSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d6d4d1",
    marginBottom: 12,
  },
  linkContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  linkTitle: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 18,
    color: "#17181a",
  },
  linkInput: {
    borderWidth: 1,
    borderColor: "#e8e7e5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#17181a",
  },
  linkActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  linkButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  linkCancel: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e8e7e5",
  },
  linkApply: {
    backgroundColor: "#17181a",
  },
  linkCancelText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: "#17181a",
  },
  linkApplyText: {
    fontFamily: "InterTight-SemiBold",
    fontSize: 15,
    color: "#fbfaf9",
  },
});

export default RichTextField;
