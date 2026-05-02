import React from "react";
import { StyleSheet, View } from "react-native";
import { TextInput, useTheme } from "react-native-paper";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchInput({
  value,
  onChangeText,
  placeholder = "Buscar cartas...",
}: SearchInputProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        dense
        left={<TextInput.Icon icon="magnify" />}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        outlineStyle={{ borderRadius: 14 }}
        contentStyle={styles.inputContent}
        theme={{
          colors: {
            primary: theme.colors.primary,
            outline: theme.colors.outline,
            onSurfaceVariant: theme.colors.onSurfaceVariant,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#fff8e6",
  },
  inputContent: {
    fontSize: 16,
  },
});
