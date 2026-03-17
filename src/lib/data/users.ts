import { db } from '../firebase';
import { ref, get, set, update } from 'firebase/database';
import type { AppUser, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';
import { logActivity } from './activity';

export async function createUserProfile(user: Omit<AppUser, 'authorized' | 'role' | 'activeStoreId'>): Promise<void> {
  const userRef = ref(db, `users/${user.id}`);
   await set(userRef, {
    name: user.name,
    email: user.email,
    authorized: true,
    role: 'user',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    aiUsage: {
        totalTokens: 0,
        totalCost: 0,
        monthlyTokens: 0,
        monthlyCost: 0,
        lastReset: getCurrentPHTISOString(),
    }
  });
  await logActivity({
      type: 'User',
      action: 'Created',
      details: `New user account created for ${user.name} (${user.email}).`,
      targetId: user.id,
      userId: user.id,
      userName: user.name
  });
}

export async function getUserById(id: string): Promise<AppUser | null> {
    const snapshot = await get(ref(db, `users/${id}`));
    if (snapshot.exists()) {
        return { id, ...snapshot.val() };
    }
    return null;
}

export async function updateUserAuthorization(userId: string, authorized: boolean, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        await update(userRef, {
            authorized: authorized,
            updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
        });
        const targetUser = snapshot.val();
        await logActivity({
            type: 'User',
            action: 'Authorization',
            details: `Access for ${targetUser?.name || 'user'} was ${authorized ? 'granted' : 'revoked'}.`,
            targetId: userId,
            ...updatedBy,
        });
    } else {
        throw new Error('User not found');
    }
}

export async function updateUserRole(userId: string, role: 'admin' | 'user', updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<void> {
    const userRef = ref(db, `users/${userId}`);
     const snapshot = await get(userRef);
    if (snapshot.exists()) {
        await update(userRef, {
            role: role,
            updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
        });
        const targetUser = snapshot.val();
        await logActivity({
            type: 'RoleChange',
            action: 'Updated',
            details: `${targetUser?.name || 'user'} was assigned the role: ${role}.`,
            targetId: userId,
            ...updatedBy,
        });
    } else {
        throw new Error('User not found');
    }
}

export async function getUsers(): Promise<AppUser[]> {
  const snapshot = await get(ref(db, 'users'));
  return snapshotToArray<AppUser>(snapshot);
}
