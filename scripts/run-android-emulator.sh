#!/usr/bin/env bash
# Lance l’émulateur Android Medium_Phone + flutter run
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

AVD="${1:-Medium_Phone}"

if ! command -v adb >/dev/null; then
  echo "adb introuvable — installe Android SDK platform-tools"
  exit 1
fi

if ! adb devices | grep -qE 'emulator-[0-9]+\s+device'; then
  echo "Démarrage AVD: $AVD …"
  nohup "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -netdelay none -netspeed full \
    >/tmp/africhess-emulator.log 2>&1 &
  for i in $(seq 1 90); do
    if adb devices | grep -qE 'emulator-[0-9]+\s+device'; then
      boot=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
      if [ "$boot" = "1" ]; then
        echo "Émulateur prêt."
        break
      fi
    fi
    sleep 2
  done
fi

adb devices
cd "$ROOT/mobile"
flutter pub get
# 10.0.2.2 = localhost de la machine hôte vu depuis l’émulateur Android
exec flutter run -d android \
  --dart-define=API_URL=http://10.0.2.2:8000/api \
  --dart-define=WS_URL=ws://10.0.2.2:8000 \
  --dart-define=MEDIA_ORIGIN=http://10.0.2.2:8000 \
  --dart-define=WEB_URL=http://10.0.2.2:3000
