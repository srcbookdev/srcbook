// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBi0xnLzOAxwWuzozJcfHAy-ym8VmA7Iyk",
  authDomain: "srcbook-57e91.firebaseapp.com",
  projectId: "srcbook-57e91",
  storageBucket: "srcbook-57e91.firebasestorage.app",
  messagingSenderId: "305614960435",
  appId: "1:305614960435:web:e4bb21049b3f8eb7e57046",
  measurementId: "G-492493CY86"
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
