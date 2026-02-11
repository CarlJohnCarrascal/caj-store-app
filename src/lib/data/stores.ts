import { db } from '../firebase';
import { ref, get, set, push, update, query, orderByChild, equalTo } from 'firebase/database';
import type { Store, StoreMemberInfo } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { logActivity } from './activity';
import { addAccount } from './accounts';

export async function getStoreMembers(storeId: string): Promise<StoreMemberInfo[]> {
  const membersRef = ref(db, `storeMembers/${storeId}`);
  const snapshot = await get(membersRef);
  if (snapshot.exists()) {
      const membersData = snapshot.val();
      return Object.keys(membersData).map(userId => ({
          id: userId,
          ...membersData[userId]
      }));
  }
  return [];
}

const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createStore(storeName: string, user: { id: string; name: string; email: string; }) {
    const userRef = ref(db, `users/${user.id}`);
    
    const newStoreRef = push(ref(db, 'stores'));
    const joinCode = generateJoinCode();
    const newStore: Omit<Store, 'id'> = {
        name: storeName,
        ownerId: user.id,
        ownerName: user.name,
        joinCode: joinCode,
        createdBy: { userId: user.id, userName: user.name, timestamp: getCurrentPHTISOString() },
    };
    await set(newStoreRef, newStore);
    const newStoreId = newStoreRef.key!;

    const memberRef = ref(db, `storeMembers/${newStoreId}/${user.id}`);
    await set(memberRef, {
        name: user.name,
        email: user.email,
        status: 'approved',
        role: 'owner',
    });

    await addAccount(newStoreId, {
        accountName: 'N/A',
        bankName: 'N/A',
        accountNumber: 'N/A',
        balance: 0,
    }, { userId: user.id, userName: user.name });

    await update(userRef, { activeStoreId: newStoreId });

    await logActivity({
        type: 'Store',
        action: 'Created',
        details: `Store "${storeName}" was created.`,
        targetId: newStoreId,
        userId: user.id,
        userName: user.name,
    });
}

export async function joinStore(joinCode: string, user: { id: string; name: string; email: string; }) {
    const storesRef = ref(db, 'stores');
    const q = query(storesRef, orderByChild('joinCode'), equalTo(joinCode));
    const snapshot = await get(q);

    if (!snapshot.exists()) {
        throw new Error('Invalid join code.');
    }

    const storeId = Object.keys(snapshot.val())[0];
    const storeData = Object.values(snapshot.val())[0] as Store;

    const memberRef = ref(db, `storeMembers/${storeId}/${user.id}`);
    const memberSnap = await get(memberRef);
    if (memberSnap.exists()) {
        const memberData = memberSnap.val();
        if(memberData.status === 'pending') {
            throw new Error('You have already requested to join this store.');
        } else if (memberData.status === 'approved') {
            throw new Error('You are already a member of this store.');
        }
    }

    await set(memberRef, {
        name: user.name,
        email: user.email,
        status: 'pending',
        role: 'member',
    });

    await logActivity({
        type: 'StoreMember',
        action: 'Created',
        details: `User "${user.name}" requested to join store "${storeData.name}".`,
        targetId: storeId,
        userId: user.id,
        userName: user.name,
    });
}

export async function approveMember(storeId: string, memberId: string, user: { userId: string; userName: string; }) {
    const storeRef = ref(db, `stores/${storeId}`);
    const storeSnap = await get(storeRef);
    if (!storeSnap.exists() || storeSnap.val().ownerId !== user.userId) {
        throw new Error("You are not the owner of this store.");
    }
    const storeData = storeSnap.val();

    const memberRef = ref(db, `storeMembers/${storeId}/${memberId}`);
    const memberSnap = await get(memberRef);
    if (!memberSnap.exists()) {
        throw new Error("Member not found.");
    }

    await update(memberRef, { status: 'approved' });

    await logActivity({
        type: 'StoreMember',
        action: 'Updated',
        details: `Membership for "${memberSnap.val().name}" was approved in store "${storeData.name}".`,
        targetId: storeId,
        ...user,
    });
}
