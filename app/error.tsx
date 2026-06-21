'use client';

import * as React from 'react';
import Link from 'next/link';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the error to the console/monitoring; never expose internals to the UI.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-8">
          An unexpected error occurred. Please try again, or head back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} className="w-full sm:w-auto bg-brand-gradient hover:opacity-90">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
