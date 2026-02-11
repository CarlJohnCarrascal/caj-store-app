

'use server';

import { revalidatePath } from 'next/cache';
import type { AppUser } from './types';

// ==================
// Revalidation-only Actions
// These actions are now minimal and only trigger cache revalidation.
// The actual database logic has been moved to the client-side data.ts file.
// ==================

export async function addProductAction() {
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/activity-logs');
}

export async function updateProductAction(id: string) {
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath(`/admin/products/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteProductAction() {
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/activity-logs');
}

export async function addCustomerAction() {
  revalidatePath('/admin/customers');
  revalidatePath('/admin/activity-logs');
}

export async function updateCustomerAction(id: string) {
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteCustomerAction() {
    revalidatePath('/admin/customers');
    revalidatePath('/admin/activity-logs');
}

export async function processOrderAction() {
    revalidatePath('/admin/activity-logs');
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/customers');
    // We don't know the specific customer ID here, so we revalidate the base path.
}

export async function createFinancialTransactionOrderAction() {
    revalidatePath('/admin/customers');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/activity-logs');
}

export async function addAccountAction() {
    revalidatePath('/admin/accounts');
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/activity-logs');
}

export async function deleteAccountAction() {
    revalidatePath('/admin/accounts');
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/activity-logs');
}

export async function addCashTransactionAction() {
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/activity-logs');
  revalidatePath('/admin/accounts');
}

export async function updateCashTransactionAction(id: string) {
  revalidatePath('/admin/cashio');
  revalidatePath(`/admin/cashio/edit/${id}`);
  revalidatePath('/admin/activity-logs');
  revalidatePath('/admin/reports/cashio');
  revalidatePath('/admin/accounts');
}

export async function deleteCashTransactionAction() {
    revalidatePath('/admin/cashio');
    revalidatePath('/admin/accounts');
    revalidatePath('/admin/activity-logs');
    revalidatePath('/admin/reports/cashio');
}

export async function deleteReceiptImageAction(transactionId: string) {
  revalidatePath(`/admin/cashio/edit/${transactionId}`);
  revalidatePath('/admin/activity-logs');
}


export async function addCollectionAction() {
    revalidatePath('/admin/collections');
    revalidatePath('/admin/activity-logs');
}

export async function updateCollectionAction(id: string) {
    revalidatePath('/admin/collections');
    revalidatePath(`/admin/collections/edit/${id}`);
    revalidatePath('/admin/activity-logs');
}

export async function deleteCollectionAction() {
    revalidatePath('/admin/collections');
    revalidatePath('/admin/activity-logs');
}

export async function addExpenseAction() {
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/activity-logs');
}

export async function updateExpenseAction(id: string) {
  revalidatePath('/admin/expenses');
  revalidatePath(`/admin/expenses/edit/${id}`);
  revalidatePath('/admin/activity-logs');
}

export async function deleteExpenseAction() {
    revalidatePath('/admin/expenses');
    revalidatePath('/admin/activity-logs');
}

export async function addFeeThresholdAction() {
    revalidatePath('/admin/cashio-fees');
    revalidatePath('/admin/activity-logs');
}

export async function updateFeeThresholdAction() {
    revalidatePath('/admin/cashio-fees');
    revalidatePath('/admin/activity-logs');
}

export async function deleteFeeThresholdAction() {
    revalidatePath('/admin/cashio-fees');
    revalidatePath('/admin/activity-logs');
}

export async function addPrintingPriceAction() {
    revalidatePath('/admin/printing/prices');
    revalidatePath('/admin/activity-logs');
}

export async function updatePrintingPriceAction() {
    revalidatePath('/admin/printing/prices');
    revalidatePath('/admin/activity-logs');
}

export async function deletePrintingPriceAction() {
    revalidatePath('/admin/printing/prices');
    revalidatePath('/admin/activity-logs');
}

// ======================================
// Server-side only / Admin-gated actions
// These can remain as they are, as they contain security checks
// or are intended to run on the server.
// ======================================

import { createUserProfile, updateUserAuthorization, getUserById, updateUserRole, regenerateCashIOReports, createStore, joinStore, approveMember } from './data';
import { getCurrentPHTISOString } from './utils';

export async function createUserProfileAction(userData: Omit<AppUser, 'authorized' | 'role' | 'activeStoreId'>) {
    await createUserProfile(userData);
}

export async function updateUserAuthorizationAction(userId: string, authorized: boolean, updatedBy: { userId: string, userName: string }) {
    const actor = await getUserById(updatedBy.userId);
    if (!actor || actor.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can change user authorization.');
    }
    await updateUserAuthorization(userId, authorized, updatedBy);
    revalidatePath('/admin/users');
}

export async function updateUserRoleAction(userId: string, role: 'admin' | 'user', updatedBy: { userId: string, userName: string }) {
    const actor = await getUserById(updatedBy.userId);
    if (!actor || actor.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can change user roles.');
    }
    if (userId === updatedBy.userId && role !== 'admin') {
        throw new Error('Admins cannot change their own role.');
    }
    await updateUserRole(userId, role, updatedBy);
    revalidatePath('/admin/users');
}

export async function regenerateCashIOReportsAction(user: { userId: string; userName: string }) {
    const actor = await getUserById(user.userId);
    if (!actor || actor.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can regenerate reports.');
    }
    await regenerateCashIOReports(actor.activeStoreId!); // Assuming admin has an active store
    revalidatePath('/admin/reports/cashio');
}

export async function createStoreAction(storeName: string, user: { userId: string; userName: string }) {
    const appUser = await getUserById(user.userId);
    if (!appUser) {
      throw new Error("User creating store not found.");
    }
    await createStore(storeName, { id: appUser.id, name: appUser.name, email: appUser.email });
    revalidatePath('/admin/stores');
    revalidatePath('/admin');
}

export async function joinStoreAction(joinCode: string, user: { id: string; name: string; email: string; }) {
    await joinStore(joinCode, user);
    revalidatePath('/admin/stores');
}

export async function approveMemberAction(storeId: string, memberId: string, user: { userId: string; userName: string; }) {
    await approveMember(storeId, memberId, user);
    revalidatePath('/admin/stores');
}

