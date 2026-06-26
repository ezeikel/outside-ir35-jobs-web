import {
  faBold,
  faItalic,
  faListOl,
  faListUl,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
} from "react-native-enriched";

// Brand-styled rich-text field built on react-native-enriched (Swmansion's
// fully-native editor — no webview). Produces HTML via onChangeHtml that
// round-trips with the web TipTap output, so a description authored on mobile
// renders/edits on web and vice-versa. A small toolbar toggles the formats a job
// listing actually needs (bold, italic, bullet + numbered lists). The editor is
// uncontrolled (the native view owns its value); `defaultValue` seeds it once and
// onChangeHtml streams the HTML out to the form.

const ACTIVE = "#17181a";
const INACTIVE = "#a3a09e";

type RichTextFieldProps = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onChangeHtml: (html: string) => void;
  error?: string | null;
};

const RichTextField = ({
  label,
  placeholder,
  defaultValue,
  onChangeHtml,
  error,
}: RichTextFieldProps) => {
  const ref = useRef<EnrichedTextInputInstance>(null);
  // Track which formats are active in the current selection to highlight the
  // toolbar buttons (onChangeState reports this from the native side).
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    ul: false,
    ol: false,
  });

  const ToolbarButton = ({
    icon,
    isActive,
    onPress,
    a11y,
  }: {
    icon: typeof faBold;
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
    >
      <FontAwesomeIcon icon={icon} size={16} color={isActive ? ACTIVE : INACTIVE} />
    </Pressable>
  );

  return (
    <View className="gap-1">
      <Text className="text-xs font-sans-medium text-muted-foreground">
        {label}
      </Text>

      <View
        className={`rounded-lg border bg-background ${error ? "border-destructive" : "border-border"}`}
      >
        {/* Formatting toolbar */}
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
        </View>

        <EnrichedTextInput
          ref={ref}
          defaultValue={defaultValue}
          placeholder={placeholder}
          placeholderTextColor="#a3a09e"
          style={styles.input}
          onChangeHtml={(e) => onChangeHtml(e.nativeEvent.value)}
          onChangeState={(e) => {
            const s = e.nativeEvent;
            setActive({
              bold: s.bold.isActive,
              italic: s.italic.isActive,
              ul: s.unorderedList.isActive,
              ol: s.orderedList.isActive,
            });
          }}
        />
      </View>

      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    gap: 4,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e7e5",
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: "#f6f5f4",
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
});

export default RichTextField;
