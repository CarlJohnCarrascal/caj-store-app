
'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, onValue, Unsubscribe, update, get } from 'firebase/database';
import { AppUser, Store, StoreMemberInfo } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthorized: boolean;
  isAdmin: boolean;
  
  // Store context
  activeStoreId: string | null;
  activeStore: Store | null;
  activeStoreRole: StoreMemberInfo['role'] | null;
  isStoreOwner: boolean;
  memberStores: Store[];
  switchStore: (storeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // New store-related state
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [memberStores, setMemberStores] = useState<Store[]>([]);
  const [activeStoreRole, setActiveStoreRole] = useState<StoreMemberInfo['role'] | null>(null);
  
  useEffect(() => {
    let appUserUnsubscribe: Unsubscribe | null = null;
    let memberStoresUnsubscribe: Unsubscribe | null = null;
    let roleUnsubscribe: Unsubscribe | null = null;

    const cleanup = () => {
      if (appUserUnsubscribe) appUserUnsubscribe();
      if (memberStoresUnsubscribe) memberStoresUnsubscribe();
      if (roleUnsubscribe) roleUnsubscribe();
    };

    const authStateUnsubscribe = onAuthStateChanged(auth, (user) => {
      cleanup();
      
      if (user) {
        setUser(user);
        const userRef = ref(db, `users/${user.uid}`);
        appUserUnsubscribe = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const dbUser = { id: user.uid, ...snapshot.val() };
            setAppUser(dbUser);
            
            const newActiveStoreId = dbUser.activeStoreId || null;
            setActiveStoreId(newActiveStoreId);

            // Listen for user's stores
            const memberRef = ref(db, `storeMembers`);
            memberStoresUnsubscribe = onValue(memberRef, async (allMembersSnapshot) => {
                const userStores: Store[] = [];
                if (allMembersSnapshot.exists()) {
                    const allStoresMembers = allMembersSnapshot.val();
                    const storePromises = Object.keys(allStoresMembers).map(async (storeId) => {
                        const members = allStoresMembers[storeId];
                        if (members && members[user.uid] && members[user.uid].status === 'approved') {
                            const storeSnap = await get(ref(db, `stores/${storeId}`));
                            if (storeSnap.exists()) {
                                userStores.push({ id: storeId, ...storeSnap.val() });
                            }
                        }
                    });
                    await Promise.all(storePromises);
                }
                setMemberStores(userStores);
                
                // Auto-set active store if none is set and there are available stores
                if (!dbUser.activeStoreId && userStores.length > 0) {
                  // This will cause a re-render, but it's an important UX improvement
                  await update(ref(db, `users/${user.uid}`), { activeStoreId: userStores[0].id });
                }
            });
            
            // Listen for role in the currently active store
            if (newActiveStoreId) {
                if(roleUnsubscribe) roleUnsubscribe(); // cleanup old role listener
                const roleRef = ref(db, `storeMembers/${newActiveStoreId}/${user.uid}`);
                roleUnsubscribe = onValue(roleRef, (roleSnap) => {
                    if (roleSnap.exists()) {
                        setActiveStoreRole(roleSnap.val().role);
                    } else {
                        setActiveStoreRole(null);
                    }
                });
            } else {
                setActiveStoreRole(null);
            }

          } else {
            setAppUser(null);
            setActiveStoreId(null);
            setMemberStores([]);
            setActiveStoreRole(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setAppUser(null);
        setActiveStoreId(null);
        setMemberStores([]);
        setActiveStoreRole(null);
        setLoading(false);
      }
    });

    return () => {
      authStateUnsubscribe();
      cleanup();
    };
  }, []);
  
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };
  
  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };
  
  const switchStore = async (storeId: string) => {
    if (user) {
        await update(ref(db, `users/${user.uid}`), { activeStoreId: storeId });
        // The onValue listener will update the state automatically
    }
  };

  const isAuthorized = !!appUser?.authorized;
  const isAdmin = appUser?.role === 'admin';
  const activeStore = memberStores.find(s => s.id === activeStoreId) || null;
  const isStoreOwner = activeStore?.ownerId === user?.uid;

  return (
    <AuthContext.Provider value={{ 
        user, appUser, loading, 
        signInWithGoogle,
        signInWithEmail, 
        signOut, 
        isAuthorized, isAdmin,
        activeStoreId,
        activeStore,
        activeStoreRole,
        isStoreOwner,
        memberStores,
        switchStore
    }}>
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
