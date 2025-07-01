'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, sendSignInLinkToEmail, signOut as firebaseSignOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, Unsubscribe } from 'firebase/database';
import { AppUser } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signInWithPin: (pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthorized: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let appUserUnsubscribe: Unsubscribe | null = null;

    const authStateUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (appUserUnsubscribe) {
        appUserUnsubscribe();
        appUserUnsubscribe = null;
      }
      
      if (user) {
        setUser(user);
        const userRef = ref(db, `users/${user.uid}`);
        appUserUnsubscribe = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setAppUser({ id: user.uid, ...snapshot.val() });
          } else {
            setAppUser(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      authStateUnsubscribe();
      if (appUserUnsubscribe) {
        appUserUnsubscribe();
      }
    };
  }, []);
  
  const signIn = async (email: string) => {
    const isDev = process.env.NODE_ENV === 'development';
    const continueUrl = isDev 
        ? 'http://localhost:3000/auth/action' 
        : `${window.location.origin}/auth/action`;

    const actionCodeSettings = {
      url: `${window.location.origin}/auth/action`,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  };
  
  const signInWithPin = async (pin: string) => {
    const email = process.env.NEXT_PUBLIC_PIN_AUTH_EMAIL;
    const prefix = process.env.NEXT_PUBLIC_PIN_AUTH_PASSWORD_PREFIX;
    const suffix = process.env.NEXT_PUBLIC_PIN_AUTH_PASSWORD_SUFFIX;

    if (!email || prefix === undefined || suffix === undefined) {
      throw new Error('PIN authentication is not configured. Please set environment variables.');
    }
    
    const password = `${prefix}${pin}${suffix}`;

    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setAppUser(null);
  };

  const isAuthorized = !!appUser?.authorized;
  const isAdmin = appUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signIn, signInWithPin, signOut, isAuthorized, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
