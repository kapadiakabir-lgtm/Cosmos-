# Cosmos — Stargazers' Community App (PRD)

## Overview
A mobile app (Expo React Native) for budding astronomers to track celestial events, log observations, and find dark-sky viewing spots. Deep-midnight-blue + gold night-mode aesthetic preserves night vision.

## Core Features
1. **Cosmos Calendar** — curated 2026 astronomical events with per-event reminders and new **"My sky" filter** (hemisphere-aware).
2. **Sightings Feed** — photo + text posts with object type, location, equipment, sky conditions; likes. Now shows a **location chip** and **nearest dark-sky spot** for the signed-in user.
3. **Dark Sky Spot Finder** — curated Bortle-rated locations; auto-sorts by distance and shows a "CLOSEST TO YOU" banner when location is granted.
4. **Stargazer Profile & Logbook** — observatory stats + tailored-to-you location panel with a "Forget" button.
5. **Event Detail** — beginner-friendly vs. advanced-specs tabs, hero imagery, and a visible-from-your-location confirmation line.

## Location-tailored content (latest)
- `LocationContext` (AsyncStorage-persisted) requests `expo-location` once, reverse-geocodes city/region/country, and derives hemisphere from latitude.
- Feed, Calendar, Sky-Map, Logbook, and Event Detail consume this context to tailor content.
- Privacy-first: single prompt, one-tap "Forget my location" in Logbook.

## Auth
JWT email/password (register/login/me). Token persisted in AsyncStorage.

## Tech stack
- Backend: FastAPI + MongoDB (motor), bcrypt + PyJWT.
- Frontend: Expo 54 + expo-router + expo-image-picker + expo-location + AsyncStorage.
- Seeded on startup: 10 major 2026 celestial events + 8 world-class dark-sky sites.

## Tests
- Backend: 25/25 pytest cases passing (auth, events, reminders, sightings, sky-spots).
- Frontend: 8/8 location-tailored UI features verified by testing agent (Playwright, mocked geolocation).

## Business enhancement hook
The location-tailored Cosmos Calendar enables premium upsells: "Cosmos Pro" for hyperlocal weather + cloud-cover forecasts, private star-party planning, guided audio for each event, and exclusive dark-sky guide downloads. Each hemisphere-aware reminder creates a daily return-to-app hook with guaranteed relevance.
