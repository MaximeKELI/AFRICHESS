import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { LocaleProvider } from "../context/LocaleContext";
import { usePushNotifications } from "../hooks/usePushNotifications";

function PushBootstrap() {
  const { user } = useAuth();
  usePushNotifications(user?.id);
  return null;
}

export default function RootLayout() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <PushBootstrap />
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
          <Stack.Screen name="learning" options={{ title: "Apprentissage" }} />
          <Stack.Screen name="tournaments" options={{ title: "Tournois" }} />
          <Stack.Screen name="friends" options={{ title: "Amis" }} />
          <Stack.Screen name="leaderboard" options={{ title: "Classements" }} />
          <Stack.Screen name="clubs" options={{ title: "Clubs" }} />
          <Stack.Screen name="clubs/[slug]" options={{ title: "Club" }} />
          <Stack.Screen name="login" options={{ title: "Connexion" }} />
          <Stack.Screen name="register" options={{ title: "Inscription" }} />
          <Stack.Screen name="premium" options={{ title: "Premium" }} />
          <Stack.Screen name="daily" options={{ title: "Daily chess" }} />
          <Stack.Screen name="studies" options={{ title: "Studies" }} />
          <Stack.Screen name="studies/[id]" options={{ title: "Study" }} />
          <Stack.Screen name="review/[id]" options={{ title: "Review" }} />
          <Stack.Screen name="auth/callback" options={{ title: "OAuth", headerShown: false }} />
        </Stack>
      </AuthProvider>
    </LocaleProvider>
  );
}
