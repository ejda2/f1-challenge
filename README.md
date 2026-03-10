# P10 · DNF1 · Constructors Challenge — Deployment Guide

## What you have
A full React app (Vite) that uses Firebase Firestore for real-time data.
All 15 players can submit picks from any device. You enter results after each race.
Scores update live for everyone instantly.

---

## Step 1 — Set up Firebase (5 minutes)

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **"Add project"** → name it something like `f1-challenge-2026` → Continue.
3. Disable Google Analytics (not needed) → **Create project**.
4. Once created, click the **`</>`** (Web) icon to add a web app.
5. Give it a nickname (e.g. `f1-web`) → click **Register app**.
6. You'll see a `firebaseConfig` object. **Copy it** — you'll need it in Step 3.
7. Click **Continue to console**.

### Enable Firestore
8. In the left sidebar, click **Build → Firestore Database**.
9. Click **Create database**.
10. Choose **"Start in production mode"** → Next.
11. Pick a region close to you (e.g. `us-east1`) → Enable.

### Set Firestore rules (allow all reads/writes for your friend group)
12. In Firestore, click the **Rules** tab.
13. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /data/{document} {
      allow read, write: if true;
    }
  }
}
```

14. Click **Publish**.

---

## Step 2 — Set up GitHub (3 minutes)

1. Go to https://github.com and create a free account if you don't have one.
2. Click **"New repository"** → name it `f1-challenge` → Public → **Create repository**.
3. On your computer, open Terminal in the `f1-challenge` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/f1-challenge.git
git push -u origin main
```

(Replace `YOUR_USERNAME` with your GitHub username.)

---

## Step 3 — Add your Firebase config

Open `src/firebase.js` and replace the placeholder values with your actual Firebase config:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "f1-challenge-2026.firebaseapp.com",
  projectId:         "f1-challenge-2026",
  storageBucket:     "f1-challenge-2026.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

Then commit and push:
```bash
git add src/firebase.js
git commit -m "Add Firebase config"
git push
```

---

## Step 4 — Deploy to Vercel (2 minutes)

1. Go to https://vercel.com and sign in with your GitHub account.
2. Click **"Add New Project"**.
3. Find your `f1-challenge` repo and click **Import**.
4. Vercel will auto-detect Vite. Click **Deploy**.
5. Wait ~60 seconds. You'll get a live URL like `f1-challenge.vercel.app`.

**That's it.** Share the URL with your 15 players.

---

## Day-to-day usage

### Before each race
- Players visit the URL, tap "I'm a Player", select their name.
- They go to "My Picks" and submit their P10, DNF1, and Constructor picks.
- Picks lock automatically at midnight on race day.

### After each race
- You visit the URL, tap "Admin", enter password: **f1admin2026**
- Select the race from the left list.
- Use the arrows to set the full finishing order (P1–P22).
- Select the DNF1 driver.
- Set the constructor order.
- Click **Save Results** — leaderboard updates for everyone instantly.

### Changing the admin password
Open `src/App.jsx` and change this line near the top:
```js
const ADMIN_PASSWORD = "f1admin2026";
```

---

## Local development (optional)

To run the app on your own computer before deploying:

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.
