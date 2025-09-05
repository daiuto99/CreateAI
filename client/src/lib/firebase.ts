import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, signInWithPopup, GoogleAuthProvider, getRedirectResult, signOut, onAuthStateChanged, User } from "firebase/auth";

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

// Set auth persistence to ensure users stay logged in
import { setPersistence, browserLocalPersistence } from "firebase/auth";
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

// Initialize Google Auth Provider
const provider = new GoogleAuthProvider();

// Enhanced authentication with cross-origin support
export const signInWithGoogle = async (useRedirect = false) => {
  // Configure provider for better cross-origin handling
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  if (useRedirect) {
    // Use redirect method for cross-origin scenarios
    return signInWithRedirect(auth, provider);
  }

  try {
    // Try popup first, with improved error handling
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error: any) {
    // Handle cross-origin and popup blocked errors
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.message?.includes('cross-origin') ||
      error.message?.includes('window.closed')
    ) {
      console.warn('Popup failed, falling back to redirect:', error.message);
      // Fallback to redirect method
      return signInWithRedirect(auth, provider);
    }
    throw error;
  }
};

// Safe popup authentication with postMessage fallback
export const signInWithGoogleSafe = async () => {
  return new Promise((resolve, reject) => {
    let messageListener: ((event: MessageEvent) => void) | null = null;

    const cleanup = () => {
      if (messageListener) {
        window.removeEventListener('message', messageListener);
      }
    };

    try {
      // Configure provider
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Use Firebase's popup method with enhanced error handling
      signInWithPopup(auth, provider)
        .then((result) => {
          cleanup();
          resolve(result);
        })
        .catch((error) => {
          cleanup();
          // Handle specific popup errors
          if (
            error.code === 'auth/popup-blocked' ||
            error.code === 'auth/popup-closed-by-user' ||
            error.message?.includes('cross-origin')
          ) {
            console.warn('Popup authentication failed, using redirect fallback');
            // Store intent to handle after redirect
            localStorage.setItem('auth_method', 'popup_fallback');
            signInWithRedirect(auth, provider).catch(reject);
          } else {
            reject(error);
          }
        });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

// Enhanced redirect result handler
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    
    // Clear any stored auth method flags
    const authMethod = localStorage.getItem('auth_method');
    if (authMethod) {
      localStorage.removeItem('auth_method');
    }
    
    return result;
  } catch (error) {
    console.error('Redirect result error:', error);
    throw error;
  }
};

// Check if we're in a cross-origin context
export const isCrossOrigin = () => {
  try {
    // Simple check for cross-origin restrictions
    return window.parent !== window && window.parent.location.hostname !== window.location.hostname;
  } catch {
    return true; // Assume cross-origin if we can't check
  }
};

// Get the best authentication method for the current context
export const getBestAuthMethod = () => {
  // Check for popup support and cross-origin issues
  const supportsPopup = 'open' in window && !isCrossOrigin();
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Some mobile browsers and embedded contexts work better with redirects
  const preferRedirect = (
    userAgent.includes('instagram') ||
    userAgent.includes('fbav') ||
    userAgent.includes('linkedin') ||
    /mobile|android|iphone|ipad/i.test(userAgent)
  );
  
  return supportsPopup && !preferRedirect ? 'popup' : 'redirect';
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