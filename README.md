# Cyber Sleuth Challenge — Live

Interactive cybersecurity training for dental teams, by Pact-One. A presenter
deck drives a Kahoot-style quiz that the audience plays on their phones, with
live answer tallies, a joined counter, and a real leaderboard.

## Files

| File | Purpose |
|---|---|
| `Cyber Sleuth Challenge.html` | 34-slide presenter deck (1920×1080). Run this on the presenting laptop. |
| `quiz.html` | Audience quiz — phones open this via the QR on slide 4. |
| `firebase-config.js` | **You edit this** — paste your Firebase web config. |
| `live.js` | Shared Firebase realtime layer. |
| `deck-logic.js` | Presenter logic: publishes phase/question, subscribes to answers. |
| `styles.css`, `deck-stage.js`, `tweaks-*.jsx` | Deck styling + shell + presenter controls. |

## Setup (one time, ~10 minutes)

### 1. Firebase (the realtime layer)
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (name it anything, Analytics off is fine).
2. In the project: **Build → Realtime Database → Create database** → pick a US region → start in **test mode**.
3. **Project settings (gear) → Your apps → Web app (`</>`)** → register (no hosting needed) → copy the `firebaseConfig` object.
4. Paste those values into `firebase-config.js`.
5. Recommended database rules (Realtime Database → Rules) — open enough for a room quiz, scoped to the quiz path:
```json
{
  "rules": {
    "sleuth": {
      "$session": {
        ".read": true,
        ".write": true
      }
    },
    ".read": false,
    ".write": false
  }
}
```

### 2. GitHub Pages (hosting the quiz)
1. Push this folder to the repo (`lebstein/Cyberslueth`):
```bash
git clone https://github.com/lebstein/Cyberslueth.git
# copy all project files in, then:
git add -A && git commit -m "Cyber Sleuth live quiz" && git push
```
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` / root → Save.
3. Your quiz lives at `https://lebstein.github.io/Cyberslueth/quiz.html`.

### 3. Point the deck at the hosted quiz
Open the deck → **Tweaks panel → Quiz link** → paste the GitHub Pages quiz URL.
The join QR re-renders instantly.

## Presenting

- Slide 4 shows the QR + a 4-letter **session code** and a live joined counter.
- Advancing to a question slide unlocks that question on every phone and starts
  a synchronized 30-second timer (adjustable in Tweaks).
- Reveal slides show real answer tallies; the final scoreboard podium and room
  average come from actual scores (ties broken by answer speed).
- **Tweaks → Start new session** gives a fresh room code (e.g. between two
  training groups). Old phones stop receiving updates.

## If something's off

- Red "LIVE DATA OFFLINE" badge on the deck → `firebase-config.js` still has
  placeholders, or the config is wrong.
- Phones stuck on "watch the screen" → they're in a different session code
  than the deck; have them rejoin with the code on slide 4.
- The presenting laptop needs internet (Firebase + QR rendering + logo asset).
