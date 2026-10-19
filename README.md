# Kampus mobile

React Native / Expo SDK 58 Android tətbiqi və mobil veb. React Navigation ilə mövcud axınlar saxlanılır. Backend: `TheSarKhan/cbarbackend`.

```sh
npm ci
npm run lint -- --max-warnings 0
npm run typecheck
npm run web
```

Development API-si emulyatorda `http://10.0.2.2:8080/api/v1`, development vebdə `http://localhost:8080/api/v1`-dir. Hosted veb öz origin-indəki `/api/v1`-ə bağlanır. İmzalı APK `https://apicbar.sarkhan.az/api/v1` istifadə edir və cleartext trafiki bağlanır. Başqa domenə avtomatik fallback və hosted PIN hardcode edilmir.

## CI/CD

PR-lərdə lint, typecheck və statik veb export işləyir. `main` yoxlamaları keçəndə Android SDK 37 ilə release APK yığılır, mövcud Kampus sertifikatı yoxlanır və yalnız mobil veb servisi yenilənir. Son APK və SHA256 `https://apicbar.sarkhan.az/download/kampus.apk` və `.sha256` ünvanlarına qoyulur; versiyalı GitHub Release də yaradılır.

Version code `100 + GITHUB_RUN_NUMBER` kimi artır. İmza açarı repoya daxil edilmir; eyni açarla əvvəlki APK-lar yenilənir. Android API 24+, arm64-v8a. APK yenilənməsi istifadəçi quraşdırması tələb edir; mövcud telefondakı tətbiq avtomatik dəyişmir.

Workflow secret-ləri: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `VPS_HOST`, `VPS_USER`, `KAMPUS_DEPLOY_KEY`, `KAMPUS_KNOWN_HOSTS`. Deploy açarı yalnız mobile forced-command-ına icazəlidir. Ortaq server kilidi və health rollback var. Telegram göndərişi yoxdur.
