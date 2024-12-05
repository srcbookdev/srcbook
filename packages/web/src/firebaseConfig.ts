// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "aaaaaaaaaaa",
  authDomain: "aaaaaa.firebaseapp.com",
  projectId: "aaaaaa",
  storageBucket: "aaaaaaaa.firebasestorage.app",
  messagingSenderId: "aaaaaaa",
  appId: "a:aaaaaaaaa:web:aaaaaaa",
  measurementId: "G-aaaaaaaaaaaa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { auth, provider, signInWithPopup, signOut, analytics };
