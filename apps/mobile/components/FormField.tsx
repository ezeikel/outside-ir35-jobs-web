import type { AnyFieldApi } from "@tanstack/react-form";
import { Text, TextInput, type TextInputProps, View } from "react-native";

// Styled field for TanStack Form (v1). Render inside a `form.Field`'s children
// render-prop and pass it the `field`. Shows the label, a brand-styled input,
// and the first validation error once the field has been touched. Matches the
// app's existing input look (rounded border, ink text, Inter Tight).

type FormFieldProps = {
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

const FormField = ({
  field,
  label,
  placeholder,
  keyboardType,
  autoCapitalize,
}: FormFieldProps) => {
  const error =
    field.state.meta.isTouched && field.state.meta.errors.length > 0
      ? // Standard-Schema errors are objects with a `message`; fall back to the
        // raw value if a plain string ever comes through.
        ((field.state.meta.errors[0] as { message?: string })?.message ??
        String(field.state.meta.errors[0]))
      : null;

  return (
    <View className="gap-1">
      <Text className="text-xs font-sans-medium text-muted-foreground">
        {label}
      </Text>
      <TextInput
        className={`rounded-lg border bg-background px-3 py-2 text-sm text-foreground ${
          error ? "border-destructive" : "border-border"
        }`}
        placeholder={placeholder}
        placeholderTextColor="#a3a09e"
        value={field.state.value}
        onChangeText={field.handleChange}
        onBlur={field.handleBlur}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : null}
    </View>
  );
};

export default FormField;
