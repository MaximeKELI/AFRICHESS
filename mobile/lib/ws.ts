import Constants from "expo-constants";
import { API_ORIGIN } from "./api";

const extra = (Constants.expoConfig?.extra ?? {}) as { wsUrl?: string; apiUrl?: string };

/** ws://10.0.2.2:8000 sur émulateur Android, dérivé de apiUrl sinon. */
export const WS_BASE =
  extra.wsUrl ?? API_ORIGIN.replace(/^http/, "ws");
