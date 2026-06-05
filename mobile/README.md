# AFRICHESS Mobile (Expo)

Application native iOS/Android — scaffold Phase 3.

## Démarrage

```bash
cd mobile
npm install
npx expo start
```

## Configuration

Dans `app.json`, section `extra.apiUrl` :

- Dev Android émulateur : `http://10.0.2.2:8000/api`
- Dev iOS simulateur : `http://localhost:8000/api`
- Appareil physique : IP LAN de votre machine

## Prochaines étapes

- Auth JWT + stockage sécurisé
- Échiquier natif (`react-native-chessboard` ou WebView)
- Notifications push (FCM / APNs)
