import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0D1117" },
          headerTintColor: "#D4A017",
          contentStyle: { backgroundColor: "#0D1117" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "AFRICHESS" }} />
        <Stack.Screen name="play" options={{ title: "Jouer" }} />
        <Stack.Screen name="bots" options={{ title: "Bots" }} />
        <Stack.Screen name="puzzles" options={{ title: "Puzzles" }} />
        <Stack.Screen name="friends" options={{ title: "Amis" }} />
        <Stack.Screen name="login" options={{ title: "Connexion" }} />
      </Stack>
    </AuthProvider>
  );
}
