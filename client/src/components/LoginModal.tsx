import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signInWithGoogleSafe, getBestAuthMethod, signInWithGoogle } from "@/lib/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export function LoginModal({ isOpen, onClose, featureName }: LoginModalProps) {
  const handleGoogleSignIn = async () => {
    try {
      const bestMethod = getBestAuthMethod();
      let result;
      
      if (bestMethod === 'redirect') {
        // Store the pending feature before redirect
        if (featureName) {
          localStorage.setItem('pendingFeature', featureName);
        }
        // Use redirect method - user will be redirected away
        await signInWithGoogle(true);
        return; // Don't close modal as page will redirect
      } else {
        // Use safe popup method with fallbacks
        result = await signInWithGoogleSafe();
      }
      
      // Only execute this if we got a result (popup succeeded)
      if (result) {
        // Close modal on successful sign-in
        onClose();
        
        // Handle feature redirect if needed
        const pendingFeature = localStorage.getItem('pendingFeature');
        if (pendingFeature) {
          localStorage.removeItem('pendingFeature');
          const featureRoutes: Record<string, string> = {
            'The Lab': '/lab',
            'Sync': '/sync',
            'Reports': '/reports',
            'Dashboard': '/dashboard'
          };
          const targetRoute = featureRoutes[pendingFeature];
          if (targetRoute) {
            // Use window.location for reliable navigation
            window.location.href = targetRoute;
          }
        }
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Sign-in failed. Please try again.';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site or try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {featureName ? `Access ${featureName}` : 'Sign In to CreateAI'}
          </DialogTitle>
          <DialogDescription>
            Sign in with your Google account to access CreateAI's content creation tools and AI-powered features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center text-gray-600">
            {featureName 
              ? `Sign in to access ${featureName} and start creating amazing content with AI assistance.`
              : 'Sign in to access all CreateAI features and start creating amazing content with AI assistance.'
            }
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleGoogleSignIn}
              className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
              data-testid="button-google-signin"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}