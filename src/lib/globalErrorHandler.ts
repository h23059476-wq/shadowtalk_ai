import { toast } from 'sonner';
import { AppError } from './AppError';

/**
 * Initializes global error listeners for the window object.
 * This ensures that unhandled promise rejections and other uncaught errors
 * don't fail silently, but instead provide user-friendly feedback via Toasts.
 */
export function setupGlobalErrorHandling() {
  if (typeof window === 'undefined') return;

  // Track the last error timestamp to prevent toast spam (e.g. from rapid retries)
  let lastToastTime = 0;
  const TOAST_COOLDOWN_MS = 2000;

  const showGlobalErrorToast = (error: AppError) => {
    const now = Date.now();
    if (now - lastToastTime < TOAST_COOLDOWN_MS) return;
    lastToastTime = now;

    // Suppress certain annoying but harmless React hydration/plugin errors
    if (error.message.includes('Hydration') || error.message.includes('chrome-extension')) {
      return;
    }

    toast.error('An unexpected error occurred', {
      description: error.message || 'Please check your connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
      duration: 5000,
    });
  };

  window.addEventListener('error', (event) => {
    // Only intercept if we have a valid error object
    if (event.error) {
      const appError = AppError.fromUnknown(event.error);
      
      // If it's a critical non-operational bug, let it bubble up to the ErrorBoundary
      // Otherwise, just toast it so the user knows something went wrong in the background
      if (appError.isOperational) {
        event.preventDefault(); // Stop it from cluttering the console as much (optional)
        showGlobalErrorToast(appError);
      }
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Promises that fail without a catch block usually shouldn't crash the app
    // We log them and show a toast
    const appError = AppError.fromUnknown(event.reason);
    
    // Prevent the default browser console error if we're handling it via toast
    // (though in dev mode, we might want to see the stack trace)
    if (import.meta.env.PROD) {
      event.preventDefault();
    }
    
    console.warn('[Global Unhandled Rejection]', appError);
    showGlobalErrorToast(appError);
  });
}
