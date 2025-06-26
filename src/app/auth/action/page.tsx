
'use client';

import { Suspense } from 'react';
import AuthActionHandler from './AuthActionHandler';

export default function AuthActionPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
            <AuthActionHandler />
        </Suspense>
    );
}
