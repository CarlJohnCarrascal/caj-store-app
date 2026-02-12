'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthActionHandler() {
  const router = useRouter();

  useEffect(() => {
    // This page is deprecated. The logic is now in the sign-in page.
    // Redirect users to the sign-in page to handle any auth state.
    router.replace('/signin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <p>Redirecting...</p>
    </div>
  );
}
