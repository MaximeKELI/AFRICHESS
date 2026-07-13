import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import { notificationsApi } from "../lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPush(userId: number | undefined): Promise<string | null> {
  if (!userId || !Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "AFRICHESS",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D4A017",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.expoConfig as { projectId?: string })?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  await notificationsApi.registerDevice({
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
    kind: "expo",
    device_id: `${Platform.OS}-${userId}`,
  });

  return token;
}

export function usePushNotifications(userId: number | undefined) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void registerForPush(userId).then((t) => {
      tokenRef.current = t;
    });
  }, [userId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string | number>;
      if (data?.challenge_id) {
        router.push("/friends");
      } else if (data?.game_id) {
        router.push(`/play?game=${data.game_id}`);
      }
    });
    return () => sub.remove();
  }, []);
}

export async function unregisterPushToken(): Promise<void> {
  const token = (await Notifications.getExpoPushTokenAsync().catch(() => null))?.data;
  if (token) {
    await notificationsApi.unregisterDevice({ token }).catch(() => {});
  }
}
