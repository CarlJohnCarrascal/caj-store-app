
'use server';

import { revalidatePath } from 'next/cache';
import { 
  AppUser,
} from './types';
import { 
  updateUserAuthorization, 
  getUserById, 
  updateUserRole, 
  regenerateCashIOReports,
} from './data';

// ==================
// Revalidation-only Actions
// These actions ONLY revalidate paths. The data logic is now in the client components.
// ==================

export async function addProductAction() {
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/inventory');
}

export async function updateProductAction(id: string) {
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath(`/admin/products/edit/${id}`);
  revalidatePath('/admin/inventory');
}

export async function deleteProductAction() {
  revalidatePath('/admin/products');
  revalidatePath('/admin/store');
  revalidatePath('/admin/inventory');
}

export async function addPublicProductAction() {
  revalidatePath('/admin/public-products');
}

export async function updatePublicProductAction(id: string) {
  revalidatePath('/admin/public-products');
  revalidatePath(`/admin/public-products/edit/${id}`);
}

export async function deletePublicProductAction() {
  revalidatePath('/admin/public-products');
}

export async function updateStockAction() {
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products');
}

export async function addCustomerAction() {
  revalidatePath('/admin/customers');
  revalidatePath('/admin/customers/[id]', 'page');
}

export async function updateCustomerAction(id: string) {
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${id}`);
}

export async function deleteCustomerAction() {
  revalidatePath('/admin/customers');
  revalidatePath('/admin/customers/[id]', 'page');
}

export async function processOrderAction() {
  revalidatePath('/admin/activity-logs');
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/customers');
  revalidatePath('/admin/reports/sales');
  revalidatePath('/admin/reports/product');
  revalidatePath('/admin/reports/customer');
  revalidatePath('/admin/reports/cashio');
  revalidatePath('/admin/reports/e-loading');
  revalidatePath('/admin/reports/printing');
  revalidatePath('/admin/reports/other-service');
  revalidatePath('/admin/inventory');
}

export async function createFinancialTransactionOrderAction() {
  revalidatePath('/admin/customers');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/activity-logs');
}

export async function addAccountAction() {
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/cashio');
}

export async function deleteAccountAction() {
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/cashio');
}

export async function addCashTransactionAction() {
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/reports/cashio');
}

export async function updateCashTransactionAction(id: string) {
  revalidatePath('/admin/cashio');
  revalidatePath(`/admin/cashio/edit/${id}`);
  revalidatePath('/admin/reports/cashio');
  revalidatePath('/admin/accounts');
}

export async function deleteCashTransactionAction() {
  revalidatePath('/admin/cashio');
  revalidatePath('/admin/accounts');
  revalidatePath('/admin/reports/cashio');
}

export async function deleteReceiptImageAction() {
  revalidatePath('/admin/activity-logs');
}

export async function addCollectionAction() {
  revalidatePath('/admin/collections');
}

export async function updateCollectionAction(id: string) {
  revalidatePath('/admin/collections');
  revalidatePath(`/admin/collections/edit/${id}`);
}

export async function deleteCollectionAction() {
  revalidatePath('/admin/collections');
}

export async function addExpenseAction() {
  revalidatePath('/admin/expenses');
}

export async function updateExpenseAction(id: string) {
  revalidatePath('/admin/expenses');
  revalidatePath(`/admin/expenses/edit/${id}`);
}

export async function deleteExpenseAction() {
  revalidatePath('/admin/expenses');
}

export async function addFeeThresholdAction() {
  revalidatePath('/admin/cashio-fees');
}

export async function updateFeeThresholdAction() {
  revalidatePath('/admin/cashio-fees');
}

export async function deleteFeeThresholdAction() {
  revalidatePath('/admin/cashio-fees');
}

export async function addPrintingPriceAction() {
  revalidatePath('/admin/printing/prices');
}

export async function updatePrintingPriceAction() {
  revalidatePath('/admin/printing/prices');
}

export async function deletePrintingPriceAction() {
  revalidatePath('/admin/printing/prices');
}

// ======================================
// Server-side only / Admin-gated actions
// These actions run on the server and are protected by role checks.
// The security rules in database.rules.json must allow these operations.
// ======================================
export async function createUserProfileAction() {
    revalidatePath('/admin/users');
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

export async function createStoreAction() {
    revalidatePath('/admin/stores');
    revalidatePath('/admin');
}

export async function joinStoreAction() {
    revalidatePath('/admin/stores');
}

export async function approveMemberAction() {
    revalidatePath('/admin/stores');
}

export async function regenerateJoinCodeAction() {
    revalidatePath('/admin/stores');
}

export async function removeStoreMemberAction() {
    revalidatePath('/admin/stores');
}
