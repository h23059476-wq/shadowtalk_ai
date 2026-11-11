 import React, { Component, ErrorInfo, ReactNode } from 'react';
 import { Button } from '@/components/ui/button';
 import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
 
 interface Props {
   children: ReactNode;
   fallback?: ReactNode;
 }
 
 interface State {
   hasError: boolean;
   error: Error | null;
   errorInfo: ErrorInfo | null;
   errorId: string | null;
 }
 
 class ErrorBoundary extends Component<Props, State> {
   constructor(props: Props) {
     super(props);
     this.state = {
       hasError: false,
       error: null,
       errorInfo: null,
       errorId: null,
     };
   }
 
   static getDerivedStateFromError(error: Error): Partial<State> {
     const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     return { hasError: true, error, errorId };
   }
 
   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     console.error('[ErrorBoundary] Caught error:', error);
     console.error('[ErrorBoundary] Error info:', errorInfo);
     console.error('[ErrorBoundary] Error ID:', this.state.errorId);
     
     this.setState({ errorInfo });
 
     // In production, log structured error for monitoring
     if (import.meta.env.PROD) {
       this.reportError(error, errorInfo);
     }
   }
 
   private reportError = async (error: Error, errorInfo: ErrorInfo) => {
     try {
       console.error('[ErrorBoundary] Error reported:', error.message, errorInfo);
     } catch (e) {
       console.error('[ErrorBoundary] Failed to report error:', e);
     }
   };
 
   handleReload = () => {
     window.location.reload();
   };
 
  handleClearCacheAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.error('[ErrorBoundary] Failed to clear cache:', e);
    } finally {
      window.location.reload();
    }
  };

   handleGoHome = () => {
     window.location.href = '/';
   };
 
   handleReset = () => {
     this.setState({
       hasError: false,
       error: null,
       errorInfo: null,
       errorId: null,
     });
   };
 
   render() {
     if (this.state.hasError) {
       if (this.props.fallback) {
         return this.props.fallback;
       }
 
       const isDev = import.meta.env.DEV;
 
       return (
         <div className="min-h-screen bg-background flex items-center justify-center p-4">
           <div className="max-w-md w-full text-center space-y-6">
             <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
               <AlertTriangle className="w-8 h-8 text-destructive" />
             </div>
 
             <div className="space-y-2">
               <h1 className="text-2xl font-bold text-foreground">
                 Something went wrong
               </h1>
               <p className="text-muted-foreground">
                 We apologize for the inconvenience. Please try refreshing the page or go back to the home page.
               </p>
               {this.state.errorId && (
                 <p className="text-xs text-muted-foreground/60 font-mono">
                   Error ID: {this.state.errorId}
                 </p>
               )}
             </div>
 
             <div className="flex flex-col sm:flex-row gap-3 justify-center">
               <Button onClick={this.handleReload} variant="default">
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Refresh Page
               </Button>
              <Button onClick={this.handleClearCacheAndReload} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
               <Button onClick={this.handleGoHome} variant="outline">
                 <Home className="w-4 h-4 mr-2" />
                 Go Home
               </Button>
               <Button
                 onClick={() => window.open(`mailto:shadowtalk@shadowtalk-ai.com?subject=Error Report: ${this.state.errorId}`)}
                 variant="ghost"
                 size="sm"
               >
                 <Mail className="w-4 h-4 mr-2" />
                 Report
               </Button>
             </div>
 
             {isDev && this.state.error && (
               <details className="mt-4 text-left">
                 <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                   <Bug className="w-4 h-4 inline mr-1" />
                   Technical Details
                 </summary>
                 <div className="mt-2 p-4 bg-muted rounded-lg overflow-auto max-h-48">
                   <p className="text-sm font-mono text-destructive mb-2">
                     {this.state.error.name}: {this.state.error.message}
                   </p>
                   {this.state.errorInfo && (
                     <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                       {this.state.errorInfo.componentStack}
                     </pre>
                   )}
                 </div>
               </details>
             )}
 
             <p className="text-xs text-muted-foreground">
               If this problem persists, please contact support with your Error ID.
             </p>
           </div>
         </div>
       );
     }
 
     return this.props.children;
   }
 }
 
 export default ErrorBoundary;
