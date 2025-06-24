'use server';

export interface Product {
  id: string;
  name: string;
  group: string;
  show: boolean;
  category: string;
  price: number;
  stock: number;
  material?: string;
  dimensions?: string;
  description: string;
  image?: string;
  unit: 'each' | 'kg';
  originalTransactionId?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Account {
  id:string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  location: string;
  balance: number;
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
  dateSent?: Date;
  dateReceived?: Date;
  customerName: string;
  customerId?: string;
  status: 'Delivered' | 'Available' | 'Claimed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  value: string;
  customerId: string;
  customerName?: string; // For display
  note?: string;
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
}

export interface ActivityLog {
  id: string;
  type: 'Product' | 'Customer' | 'Order' | 'CashIO' | 'Collection' | 'Account';
  action: 'Created' | 'Updated' | 'Deleted';
  timestamp: Date;
  details: string;
  targetId: string;
}
