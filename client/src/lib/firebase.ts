import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBYwnoz1g1GcKG78XfUkQ_XyYndpBf7Tv8",
  authDomain: "createai-2f54c.firebaseapp.com",
  projectId: "createai-2f54c",
  storageBucket: "createai-2f54c.firebasestorage.app",
  messagingSenderId: "368895421936",
  appId: "1:368895421936:web:c9a503497aa269e8e18135",
  measurementId: "G-PPRRLTVTCT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
const provider = new GoogleAuthProvider();

// Function to sign in with Google
export const signInWithGoogle = () => {
  return signInWithRedirect(auth, provider);
};

// Function to handle redirect result
export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

// Function to sign out
export const signOutUser = () => {
  return signOut(auth);
};

// Function to listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;