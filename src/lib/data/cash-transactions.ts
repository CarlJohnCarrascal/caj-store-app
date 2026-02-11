import { db } from '../firebase';
import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import type { CashTransaction, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';
import { logActivity } from './activity';
import { updateCashIOReport } from './reports';

export async function getCashTransactions(storeId: string): Promise<CashTransaction[]> {
  const transactionsSnapshot = await get(ref(db, `storeData/${storeId}/cashTransactions`));
  const transactions = snapshotToArray<CashTransaction>(transactionsSnapshot);

  const accountsSnapshot = await get(ref(db, `storeData/${storeId}/accounts`));
  const accountsData = accountsSnapshot.val() || {};

  const transactionsWithAccountNames = transactions.map(transaction => {
    const account = accountsData[transaction.accountUsedId];
    return {
      ...transaction,
      ourAccountName: account ? account.accountName : 'Unknown Account',
    };
  });
  return transactionsWithAccountNames.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCashTransactionById(storeId: string, id: string): Promise<CashTransaction | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/cashTransactions/${id}`));
  if (snapshot.exists()) {
    return { id, ...snapshot.val() };
  }
  return undefined;
}


export async function isReferenceNumberDuplicate(storeId: string, reference: string): Promise<boolean> {
  const transactionsRef = ref(db, `storeData/${storeId}/cashTransactions`);
  const q = query(transactionsRef, orderByChild('reference'), equalTo(reference));
  const snapshot = await get(q);
  return snapshot.exists();
}

export async function getCashTransactionByReference(storeId: string, reference: string): Promise<CashTransaction | null> {
    const transactionsRef = ref(db, `storeData/${storeId}/cashTransactions`);
    const q = query(transactionsRef, orderByChild('reference'), equalTo(reference));
    const snapshot = await get(q);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const id = Object.keys(data)[0];
        return { id, ...data[id] };
    }
    return null;
}


export async function addCashTransaction(storeId: string, transactionData: Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance' | 'transactionDate'> & { datetime?: string }, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<CashTransaction> {
  const accountRef = ref(db, `storeData/${storeId}/accounts/${transactionData.accountUsedId}`);
  const accountSnapshot = await get(accountRef);
  if (!accountSnapshot.exists()) {
    throw new Error("Account not found");
  }

  const account = accountSnapshot.val();
  let newBalance;
  if (transactionData.transactionType === 'Cash In') {
    newBalance = account.balance + transactionData.amount - transactionData.fee;
  } else { // Cash Out
    newBalance = account.balance - transactionData.amount - transactionData.fee;
  }
  await update(accountRef, { balance: newBalance });
  
  const nowPHTString = getCurrentPHTISOString();
  
  let transactionDateString: string;
  if (transactionData.datetime && transactionData.datetime.length > 0) {
    transactionDateString = `${transactionData.datetime}:00+08:00`;
  } else {
    transactionDateString = nowPHTString;
  }
  
  const newTransactionRef = push(ref(db, `storeData/${storeId}/cashTransactions`));

  const dataToSave: any = {
    ...transactionData,
    newBalance,
    transactionDate: transactionDateString,
    createdAt: nowPHTString,
    updatedAt: nowPHTString,
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  
  delete dataToSave.datetime;

  await set(newTransactionRef, dataToSave);
  
  await logActivity({
    type: 'CashIO',
    action: 'Created',
    details: `${transactionData.transactionType} of ₱${transactionData.amount.toFixed(2)} for "${transactionData.accountName}" was recorded.`,
    targetId: newTransactionRef.key!,
    ...createdBy,
  });
  
  const result = { ...dataToSave, id: newTransactionRef.key! };
  await updateCashIOReport(storeId, result, 'allTransactions');

  return result;
}

export async function updateCashTransaction(
  storeId: string,
  id: string,
  transactionData: Partial<Omit<CashTransaction, 'id' | 'createdAt' | 'updatedAt' | 'newBalance' | 'transactionDate'>> & { datetime?: string },
  updatedBy: Omit<ChangeTracker, 'timestamp'>
): Promise<CashTransaction> {
    const transactionRef = ref(db, `storeData/${storeId}/cashTransactions/${id}`);
    const oldTransactionSnapshot = await get(transactionRef);
    if (!oldTransactionSnapshot.exists()) {
        throw new Error("Transaction to update not found");
    }
    const oldTransaction: CashTransaction = { id, ...oldTransactionSnapshot.val() };

    let finalNewBalanceForAccount;

    const needsBalanceUpdate = 'amount' in transactionData || 'fee' in transactionData || 'accountUsedId' in transactionData;

    if (needsBalanceUpdate) {
        const oldAccountRef = ref(db, `storeData/${storeId}/accounts/${oldTransaction.accountUsedId}`);
        const oldAccountSnapshot = await get(oldAccountRef);
        if (oldAccountSnapshot.exists()) {
            const oldAccount = oldAccountSnapshot.val();
            let balanceReversal = 0;
            if (oldTransaction.transactionType === 'Cash In') {
                balanceReversal = -oldTransaction.amount + oldTransaction.fee;
            } else { // Cash Out
                balanceReversal = oldTransaction.amount + oldTransaction.fee;
            }
            await update(oldAccountRef, { balance: oldAccount.balance + balanceReversal });
        }

        const newAccountUsedId = transactionData.accountUsedId || oldTransaction.accountUsedId;
        const newTransactionType = transactionData.transactionType || oldTransaction.transactionType;
        const newAmount = transactionData.amount ?? oldTransaction.amount;
        const newFee = transactionData.fee ?? oldTransaction.fee;
        
        const newAccountRef = ref(db, `storeData/${storeId}/accounts/${newAccountUsedId}`);
        const newAccountSnapshot = await get(newAccountRef);
        if (!newAccountSnapshot.exists()) {
            throw new Error("New account not found");
        }
        const newAccount = newAccountSnapshot.val();
        let newEffect = 0;
        if (newTransactionType === 'Cash In') {
            newEffect = newAmount - newFee;
        } else { // Cash Out
            newEffect = -newAmount - newFee;
        }
        finalNewBalanceForAccount = newAccount.balance + newEffect;
        await update(newAccountRef, { balance: finalNewBalanceForAccount });
    }

    const nowPHTString = getCurrentPHTISOString();
    let transactionDateString: string;
    if (transactionData.datetime && transactionData.datetime.length > 0) {
        transactionDateString = `${transactionData.datetime}:00+08:00`;
    } else {
        transactionDateString = oldTransaction.transactionDate || nowPHTString;
    }

    const dataToSave: any = {
        ...oldTransaction,
        ...transactionData,
        transactionDate: transactionDateString,
        updatedAt: nowPHTString,
        updatedBy: { ...updatedBy, timestamp: nowPHTString },
    };
    
    if (finalNewBalanceForAccount !== undefined) {
        dataToSave.newBalance = finalNewBalanceForAccount;
    }
    
    delete dataToSave.datetime;

    await set(transactionRef, dataToSave);
    
    const newTransaction = { id, ...dataToSave };

    await updateCashIOReport(storeId, oldTransaction, 'allTransactions', undefined, -1);
    if (oldTransaction.customerId) {
        await updateCashIOReport(storeId, oldTransaction, 'orderedTransactions', oldTransaction.customerId, -1);
    }
    await updateCashIOReport(storeId, newTransaction, 'allTransactions');
    if (newTransaction.customerId) {
        await updateCashIOReport(storeId, newTransaction, 'orderedTransactions', newTransaction.customerId);
    }

    await logActivity({
        type: 'CashIO',
        action: 'Updated',
        details: `Transaction for "${newTransaction.accountName}" was updated.`,
        targetId: newTransaction.id,
        ...updatedBy,
    });


    return newTransaction;
}

export async function deleteCashTransaction(storeId: string, id: string): Promise<CashTransaction | null> {
    const transactionRef = ref(db, `storeData/${storeId}/cashTransactions/${id}`);
    const snapshot = await get(transactionRef);
    if (snapshot.exists()) {
        const deletedTransaction: CashTransaction = { id, ...snapshot.val() };
        
        if (deletedTransaction.customerId) {
            throw new Error('This transaction cannot be deleted because it is part of a processed order.');
        }

        await remove(transactionRef);
        return deletedTransaction;
    }
    return null;
}
