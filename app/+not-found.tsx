import { Link, Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

import EmptyState from "@/components/ui/EmptyState";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Surface style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Pantalla no encontrada
        </Text>

        <EmptyState
          title="Esta ruta no existe"
          description="Regresa al catalogo para seguir navegando la app."
        />

        <Link href="/" asChild>
          <Button mode="contained" style={styles.button}>
            Ir al inicio
          </Button>
        </Link>
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff4dc",
  },
  title: {
    color: "#2f2208",
    fontWeight: "800",
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
  },
});
