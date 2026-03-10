// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Replace the values below with your Firebase project config.
//
// How to get these values:
//   1. Go to https://console.firebase.google.com
//   2. Create a new project (e.g. "f1-challenge-2026")
//   3. Click the </> Web icon to add a web app
//   4. Copy the firebaseConfig object and paste the values below
//   5. In the Firebase console, go to Build → Firestore Database → Create database
//      Choose "Start in production mode" and pick a region close to you
//   6. Go to Firestore → Rules and replace the rules with:
//
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /data/{document} {
//              allow read: if true;
//              allow write: if true;
//            }
//          }
//        }
//
//      (This allows all reads/writes. Fine for a private friend group.)
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyDqVJ93s3MrGAyZldtGtX9yQCL4LkJVAm4",
  authDomain:        "f1-p10-challenge.firebaseapp.com",
  projectId:         "f1-p10-challenge",
  storageBucket:     "f1-p10-challenge.firebasestorage.app",
  messagingSenderId: "277787506334",
  appId:             "1:277787506334:web:921b2dfdfb6d4093ca6d8f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
