# Cosmos — Stargazers' Community App (PRD)

## Overview
A mobile app (Expo React Native) for budding astronomers to track celestial events, log observations, and find dark-sky viewing spots. Deep-midnight-blue + gold night-mode aesthetic preserves night vision.

## Core Features (MVP delivered)
1. **Cosmos Calendar** — curated 2026 astronomical events (meteor showers, eclipses, oppositions) with per-event reminders.
2. **Sightings Feed** — photo + text posts with object type, location, equipment, sky conditions; like functionality; infinite scroll.
3. **Dark Sky Spot Finder** — curated Bortle-rated dark-sky locations with user-location-based distance sorting (expo-location).
4. **Stargazer Profile & Logbook** — personal observatory stats (nebulae / planets / galaxies / meteors) + personal sighting history grid.
5. **Event Detail** — beginner-friendly vs. advanced-specs tabs with hero imagery.

## Auth
JWT email/password (register/login/me). Token persisted in AsyncStorage. Emergent Google OAuth deferred (native mobile flow complexity).

## Tech stack
- Backend: FastAPI + MongoDB (motor), bcrypt + PyJWT.
- Frontend: Expo 54, expo-router, expo-image-picker, expo-location, @react-native-async-storage/async-storage.
- Seeded: 10 major 2026 celestial events + 8 world-class dark sky sites on startup.

## Business enhancement hook
The Cosmos Calendar + per-event reminders create a natural premium upgrade path (e.g., "Cosmos Pro" with live weather forecasts per reminder, exclusive dark-sky guides, and group star-party planning). Each reminder adds a daily return-to-app hook.
