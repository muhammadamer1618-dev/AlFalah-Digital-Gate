import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNFrPNCuQefOXHTCmiiKSBjgPLUy5Ug4U",
  authDomain: "follow-up-2026.firebaseapp.com",
  projectId: "follow-up-2026",
  storageBucket: "follow-up-2026.firebasestorage.app",
  messagingSenderId: "1077131515114",
  appId: "1:1077131515114:web:d10d9c5228382d7cfdb393"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
