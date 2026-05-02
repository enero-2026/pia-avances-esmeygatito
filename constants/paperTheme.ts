import { Platform } from "react-native";
import { MD3LightTheme, type MD3Theme } from "react-native-paper";

const brandFontFamily = Platform.select({
  web: "Space Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
  ios: "SpaceMono-Regular",
  android: "SpaceMono-Regular",
  default: "SpaceMono-Regular",
});

const bodyFontFamily = Platform.select({
  web: "Trebuchet MS, Segoe UI, Tahoma, sans-serif",
  ios: "System",
  android: "sans-serif",
  default: "sans-serif",
});

const baseFonts = MD3LightTheme.fonts;

export const appPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 14,
  fonts: {
    ...baseFonts,
    displayLarge: { ...baseFonts.displayLarge, fontFamily: brandFontFamily },
    displayMedium: { ...baseFonts.displayMedium, fontFamily: brandFontFamily },
    displaySmall: { ...baseFonts.displaySmall, fontFamily: brandFontFamily },
    headlineLarge: { ...baseFonts.headlineLarge, fontFamily: brandFontFamily },
    headlineMedium: {
      ...baseFonts.headlineMedium,
      fontFamily: brandFontFamily,
    },
    headlineSmall: { ...baseFonts.headlineSmall, fontFamily: brandFontFamily },
    titleLarge: { ...baseFonts.titleLarge, fontFamily: brandFontFamily },
    titleMedium: { ...baseFonts.titleMedium, fontFamily: brandFontFamily },
    titleSmall: { ...baseFonts.titleSmall, fontFamily: brandFontFamily },
    labelLarge: { ...baseFonts.labelLarge, fontFamily: brandFontFamily },
    labelMedium: { ...baseFonts.labelMedium, fontFamily: brandFontFamily },
    labelSmall: { ...baseFonts.labelSmall, fontFamily: brandFontFamily },
    bodyLarge: { ...baseFonts.bodyLarge, fontFamily: bodyFontFamily },
    bodyMedium: { ...baseFonts.bodyMedium, fontFamily: bodyFontFamily },
    bodySmall: { ...baseFonts.bodySmall, fontFamily: bodyFontFamily },
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: "#ef5350",
    onPrimary: "#ffffff",
    primaryContainer: "#ffe2e1",
    onPrimaryContainer: "#5f0d0a",
    secondary: "#2a75bb",
    onSecondary: "#ffffff",
    secondaryContainer: "#dbeeff",
    onSecondaryContainer: "#0c355a",
    tertiary: "#ffcb05",
    onTertiary: "#2f2208",
    tertiaryContainer: "#fff0b5",
    onTertiaryContainer: "#3c2b00",
    background: "#fff7e6",
    onBackground: "#2f2208",
    surface: "#fffdf7",
    onSurface: "#2f2208",
    surfaceVariant: "#f4ecd8",
    onSurfaceVariant: "#5a4722",
    outline: "#d8b75c",
    outlineVariant: "#ecdca9",
    error: "#b3261e",
    onError: "#ffffff",
    errorContainer: "#f9dedc",
    onErrorContainer: "#410e0b",
  },
};
