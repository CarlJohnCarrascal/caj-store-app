import { db } from '../firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import type { Expense, ChangeTracker } from '../types';
import { getCurrentPHTISOString } from '../utils';
import { snapshotToArray } from './helpers';

export async function getExpenses(storeId: string): Promise<Expense[]> {
  const snapshot = await get(ref(db, `storeData/${storeId}/expenses`));
  const expenses = snapshotToArray<Expense>(snapshot);
  const expensesWithDates = expenses.map(e => ({
    ...e,
    date: e.date,
    createdAt: e.createdAt,
  }));
  return expensesWithDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExpenseById(storeId: string, id: string): Promise<Expense | undefined> {
  const snapshot = await get(ref(db, `storeData/${storeId}/expenses/${id}`));
  if (snapshot.exists()) {
    const expense = snapshot.val();
    const expenseWithDate = {
      ...expense,
      id,
      date: expense.date,
      createdAt: expense.createdAt,
    };
    return expenseWithDate;
  }
  return undefined;
}

export async function addExpense(storeId: string, expenseData: Omit<Expense, 'id' | 'createdAt'>, createdBy: Omit<ChangeTracker, 'timestamp'>): Promise<Expense> {
  const newExpenseRef = push(ref(db, `storeData/${storeId}/expenses`));
  const dataToSave = {
    ...expenseData,
    date: new Date(expenseData.date).toISOString(),
    createdAt: getCurrentPHTISOString(),
    createdBy: { ...createdBy, timestamp: getCurrentPHTISOString() },
  };
  await set(newExpenseRef, dataToSave);
  return { ...dataToSave, id: newExpenseRef.key! };
}

export async function updateExpense(storeId: string, id: string, expenseData: Omit<Expense, 'id' | 'createdAt'>, updatedBy: Omit<ChangeTracker, 'timestamp'>): Promise<Expense> {
    const expenseRef = ref(db, `storeData/${storeId}/expenses/${id}`);
    const snapshot = await get(expenseRef);
    if(snapshot.exists()){
      const existingData = snapshot.val();
      const dataToSave = {
          ...existingData,
          ...expenseData,
          date: new Date(expenseData.date).toISOString(),
          updatedBy: { ...updatedBy, timestamp: getCurrentPHTISOString() },
      };
      await set(expenseRef, dataToSave);
      return { ...dataToSave, id, createdAt: existingData.createdAt };
    }
    throw new Error("Expense not found");
}

export async function deleteExpense(storeId: string, id: string): Promise<Expense | null> {
    const expenseRef = ref(db, `storeData/${storeId}/expenses/${id}`);
    const snapshot = await get(expenseRef);
    if (snapshot.exists()) {
        const deletedExpense = { id, ...snapshot.val() };
        await remove(expenseRef);
        return deletedExpense;
    }
    return null;
}
