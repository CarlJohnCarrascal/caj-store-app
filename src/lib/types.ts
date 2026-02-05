

'use server';

export interface ChangeTracker {
  userId: string;
  userName: string;
  timestamp: string; // ISO string
}

export interface Store {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  joinCode: string;
  createdBy?: ChangeTracker;
}

export interface StoreMemberInfo {
  id: string; // user id
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'owner' | 'admin' | 'member';
}

export interface AppUser {
  id: string; // Firebase UID
  name: string;
  email: string;
  authorized: boolean; // Keep this for global app access
  role: 'admin' | 'user'; // Global role
  activeStoreId?: string; // Newly active store
  updatedBy?: ChangeTracker;
}

export interface Product {
  id: string;
  name: string;
  group: string;
  show: boolean;
  category: string;
  price: number;
  stock: number;
  barcode?: string;
  material?: string;
  dimensions?: string;
  description: string;
  image?: string;
  unit: 'each' | 'kg';
  originalTransactionId?: string;
  fromScanned?: string;
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Account {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  location: string;
  balance: number;
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface CashTransaction {
  id: string;
  paymentMethod: 'Gcash' | 'Maya' | 'Other';
  accountUsedId: string;
  ourAccountName?: string; // For display
  transactionType: 'Cash In' | 'Cash Out';
  message: string;
  accountName: string;
  accountNumber: string;
  reference: string;
  amount: number;
  fee: number;
  newBalance: number;
  transactionDate: string; // ISO string with timezone
  customerId?: string;
  status: 'Delivered' | 'Available' | 'Claimed' | 'Processing';
  receiptImageUrl?: string;
  fromScanned?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface Collection {
  id: string;
  name: string;
  value: string;
  customerId: string;
  customerName?: string; // For display
  note?: string;
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountTendered: number;
  settlementType: 'pay_order' | 'add_to_balance';
  createdAt: string; // ISO string
  initialCustomerBalance?: number;
  newCustomerBalance?: number;
  applyCustomerBalance?: boolean;
  createdBy?: ChangeTracker;
}

export interface ActivityLog {
  id: string;
  type: 'Product' | 'Customer' | 'Order' | 'CashIO' | 'Collection' | 'Account' | 'Expense' | 'User' | 'FeeThreshold' | 'System' | 'PrintingPrice' | 'Store' | 'StoreMember';
  action: 'Created' | 'Updated' | 'Deleted' | 'Authorization' | 'RoleChange';
  timestamp: Date;
  details: string;
  targetId: string;
  userId: string;
  userName: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO string
  notes?: string;
  createdAt: string; // ISO string
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface FeeThreshold {
  id: string;
  from: number;
  to: number;
  fee: number;
  type: 'fixed' | 'per_thousand_flat';
  notes?: string;
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}

export interface PrintingPrice {
  id: string;
  service: string;
  size: string;
  type: 'Color' | 'Black & White' | 'N/A';
  price: number;
  notes?: string;
  createdBy?: ChangeTracker;
  updatedBy?: ChangeTracker;
}


export interface ProductReportData {
  totalQuantity: number;
  totalSales: number;
  totalOrders: number;
}

export interface EloadingReportData {
    totalCost: number;
    totalFee: number;
    byServiceType: { [key: string]: { count: number; cost: number; fee: number } };
}

export interface PrintingReportData {
    totalSales: number;
    byServiceType: {
        [key: string]: {
            count: number;
            sales: number;
            bySize: { [size: string]: number };
        };
    };
}

export interface OtherServiceReportData {
    totalCost: number;
    totalFee: number;
    totalOrders: number;
}
