
'use server';

import { Product, Account, Customer, CashTransaction } from './types';

let products: Product[] = [
  {
    id: '1',
    name: 'Aether-Wing Chair',
    group: 'Seating',
    show: true,
    category: 'Furniture',
    price: 399.99,
    stock: 15,
    material: 'Ash Wood, Bouclé',
    dimensions: 'W: 30", D: 32", H: 35"',
    description: 'Ergonomically designed for comfort, this chair features a unique wingback design, providing a cozy and stylish seating experience.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '2',
    name: 'Lunar Glow Lamp',
    group: 'Lamps',
    show: true,
    category: 'Lighting',
    price: 129.50,
    stock: 30,
    material: 'Ceramic, Frosted Glass',
    dimensions: 'Dia: 10", H: 18"',
    description: 'Casting a soft, ambient light, the Lunar Glow Lamp adds a touch of modern elegance to any room with its sculptural ceramic base.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '3',
    name: 'Terra Weave Rug',
    group: 'Rugs',
    show: true,
    category: 'Textiles',
    price: 249.00,
    stock: 25,
    material: 'Jute, Wool',
    dimensions: '5\' x 8\'',
    description: 'Handwoven with natural jute and wool fibers, this rug brings warmth and texture to your space, grounding it with earthy tones.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '4',
    name: 'Orbit Coffee Table',
    group: 'Tables',
    show: true,
    category: 'Furniture',
    price: 599.00,
    stock: 10,
    material: 'Solid Walnut, Glass',
    dimensions: 'Dia: 36", H: 16"',
    description: 'A statement piece with a sleek, circular design. The Orbit table combines a solid walnut frame with a tempered glass top.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
   {
    id: '5',
    name: 'Chrono Desk Clock',
    group: 'Clocks',
    show: true,
    category: 'Decor',
    price: 75.00,
    stock: 50,
    material: 'Brushed Steel, Oak',
    dimensions: 'W: 5", D: 2", H: 5"',
    description: 'A minimalist desk clock that combines a brushed steel case with a solid oak face. Silent quartz movement ensures no ticking.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '6',
    name: 'Nimbus Throw Pillow',
    group: 'Pillows',
    show: true,
    category: 'Textiles',
    price: 45.99,
    stock: 40,
    material: 'Velvet, Down Fill',
    dimensions: '18" x 18"',
    description: 'Plush and luxurious, the Nimbus pillow is made from high-quality velvet and filled with soft down for ultimate comfort.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '7',
    name: 'Strata Bookshelf',
    group: 'Storage',
    show: true,
    category: 'Furniture',
    price: 899.00,
    stock: 8,
    material: 'Powder-coated Steel, Oak Veneer',
    dimensions: 'W: 40", D: 12", H: 72"',
    description: 'A modern, modular bookshelf with a sturdy steel frame and oak veneer shelves, perfect for displaying your favorite reads and decor.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '8',
    name: 'Solstice Scented Candle',
    group: 'Candles',
    show: true,
    category: 'Decor',
    price: 32.00,
    stock: 100,
    material: 'Soy Wax, Essential Oils',
    dimensions: '3" x 4"',
    description: 'A hand-poured soy wax candle with notes of sandalwood, amber, and citrus. Provides up to 50 hours of clean burn time.',
    image: 'https://placehold.co/600x600.png',
    unit: 'each',
  },
  {
    id: '9',
    name: 'Organic Coffee Beans',
    group: 'Pantry',
    show: true,
    category: 'Food & Drink',
    price: 25.00,
    stock: 100,
    material: 'N/A',
    dimensions: 'N/A',
    description: 'Rich, full-bodied organic coffee beans sourced from the highlands of Colombia. Perfect for a morning brew. Sold by the kilogram.',
    image: 'https://placehold.co/600x600.png',
    unit: 'kg',
  },
];

let accounts: Account[] = [
    { id: 'acc-1', accountName: 'Main Business Account', accountNumber: '123-456-7890', bankName: 'BDO', balance: 150000 },
    { id: 'acc-2', accountName: 'GCash Wallet', accountNumber: '09171234567', bankName: 'GCash', balance: 25000 },
    { id: 'acc-3', accountName: 'Maya Wallet', accountNumber: '09281234567', bankName: 'Maya', balance: 18000 },
];

let customers: Customer[] = [
    { id: 'cust-1', name: 'John Doe', email: 'john.d@example.com', phone: '09112223333', address: '123 Main St, Anytown', location: 'Anytown', balance: 150 },
    { id: 'cust-2', name: 'Jane Smith', email: 'jane.s@example.com', phone: '09445556666', address: '456 Oak Ave, Othertown', location: 'Othertown', balance: -50 },
    { id: 'cust-3', name: 'Aira Buenconcejo', email: 'aira.b@example.com', phone: '09123456781', address: 'Purok 1, Siuton', location: 'Siuton', balance: 70 },
    { id: 'cust-4', name: 'Carl John Carrascal', email: 'carl.c@example.com', phone: '09123456782', address: 'Purok 2, Siuton', location: 'Siuton', balance: 350 },
    { id: 'cust-5', name: 'Crisanto Antiado', email: 'crisanto.a@example.com', phone: '09123456783', address: 'Purok 3, Siuton', location: 'Siuton', balance: 0 },
    { id: 'cust-6', name: 'Crizza Rotaeche', email: 'crizza.r@example.com', phone: '09123456784', address: 'Purok 4, Siuton', location: 'Siuton', balance: -510 },
    { id: 'cust-7', name: 'Dhon Carrascal', email: 'dhon.c@example.com', phone: '09123456785', address: 'Purok 5, Siuton', location: 'Siuton', balance: 0 },
    { id: 'cust-8', name: 'Francis Maquiling', email: 'francis.m@example.com', phone: '09123456786', address: 'Purok 6, Siuton', location: 'Siuton', balance: 510 },
];

let cashTransactions: CashTransaction[] = [
    {
        id: 'txn-1',
        paymentMethod: 'Gcash',
        accountUsedId: 'acc-2',
        transactionType: 'Cash In',
        message: 'Payment for services',
        accountName: 'John Doe',
        accountNumber: '09112223333',
        reference: 'REF12345',
        amount: 1500.00,
        fee: 0,
        newBalance: 26500,
        dateRecieved: new Date('2023-10-26T10:00:00Z'),
        customerName: 'John Doe',
        status: 'Delivered',
        createdAt: new Date('2023-10-26T09:55:00Z'),
        updatedAt: new Date('2023-10-26T10:00:00Z'),
    },
    {
        id: 'txn-2',
        paymentMethod: 'Maya',
        accountUsedId: 'acc-3',
        transactionType: 'Cash Out',
        message: 'Supplier payment',
        accountName: 'Hardware Supply Co.',
        accountNumber: '09998887777',
        reference: 'REF67890',
        amount: 5000.00,
        fee: 10,
        newBalance: 13000,
        dateClaimedOrSent: new Date('2023-10-27T14:30:00Z'),
        customerName: 'Hardware Supply Co.',
        status: 'Claimed',
        createdAt: new Date('2023-10-27T14:25:00Z'),
        updatedAt: new Date('2023-10-27T14:30:00Z'),
    },
    {
        id: 'txn-3',
        paymentMethod: 'Gcash',
        accountUsedId: 'acc-2',
        transactionType: 'Cash In',
        message: 'New order payment',
        accountName: 'Jane Smith',
        accountNumber: '09445556666',
        reference: 'REFABCDE',
        amount: 750.00,
        fee: 0,
        newBalance: 27250,
        customerName: 'Jane Smith',
        status: 'Pending',
        createdAt: new Date('2023-10-28T11:00:00Z'),
        updatedAt: new Date('2023-10-28T11:00:00Z'),
    },
    {
        id: 'txn-4',
        paymentMethod: 'Other',
        accountUsedId: 'acc-1',
        transactionType: 'Cash Out',
        message: 'Rent payment',
        accountName: 'Landlord',
        accountNumber: 'N/A',
        reference: 'RENTNOV',
        amount: 10000.00,
        fee: 0,
        newBalance: 140000,
        customerName: 'Office Rent',
        status: 'Available',
        createdAt: new Date('2023-10-28T15:00:00Z'),
        updatedAt: new Date('2023-10-28T15:00:00Z'),
    },
    {
        id: 'txn-5',
        paymentMethod: 'Maya',
        accountUsedId: 'acc-3',
        transactionType: 'Cash In',
        message: 'Refund from supplier',
        accountName: 'Hardware Supply Co.',
        accountNumber: '09998887777',
        reference: 'REFZYXWV',
        amount: 250.00,
        fee: 0,
        newBalance: 13250,
        customerName: 'Hardware Supply Co.',
        status: 'Cancelled',
        createdAt: new Date('2023-10-29T09:00:00Z'),
        updatedAt: new Date('2023-10-29T09:05:00Z'),
    },
    {
        id: 'txn-6',
        paymentMethod: 'Gcash',
        accountUsedId: 'acc-2',
        transactionType: 'Cash In',
        message: 'Payment for rush print',
        accountName: 'Mark Reyes',
        accountNumber: '09121231234',
        reference: 'REFPRINT',
        amount: 350.00,
        fee: 0,
        newBalance: 27600,
        customerName: 'Mark Reyes',
        status: 'Delivered',
        createdAt: new Date('2023-11-01T11:00:00Z'),
        updatedAt: new Date('2023-11-01T11:00:00Z'),
    },
     {
        id: 'txn-7',
        paymentMethod: 'Other',
        accountUsedId: 'acc-1',
        transactionType: 'Cash Out',
        message: 'Internet Bill',
        accountName: 'PLDT',
        accountNumber: '028888171',
        reference: 'BILLNOV',
        amount: 1699.00,
        fee: 0,
        newBalance: 138301,
        customerName: 'PLDT',
        status: 'Claimed',
        createdAt: new Date('2023-11-02T15:00:00Z'),
        updatedAt: new Date('2023-11-02T15:00:00Z'),
    },
];

export async function getProducts(): Promise<Product[]> {
  // In a real app, this would fetch from a database
  return Promise.resolve(products);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return Promise.resolve(products.find(p => p.id === id));
}

export async function addProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const newProduct: Product = {
    ...product,
    id: `prod-${Date.now()}`,
  };
  products.push(newProduct);
  return Promise.resolve(newProduct);
}

export async function updateProduct(updatedProduct: Product): Promise<Product | null> {
  const index = products.findIndex(p => p.id === updatedProduct.id);
  if (index !== -1) {
    products[index] = updatedProduct;
    return Promise.resolve(updatedProduct);
  }
  return Promise.resolve(null);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products.splice(index, 1);
    return Promise.resolve(true);
  }
  return Promise.resolve(false);
}

export async function getAccounts(): Promise<Account[]> {
  return Promise.resolve(accounts);
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<Account> {
  const newAccount: Account = {
    id: `acc-${Date.now()}`,
    ...account,
  };
  accounts.push(newAccount);
  return Promise.resolve(newAccount);
}

export async function getCustomers(): Promise<Customer[]> {
  return Promise.resolve(customers);
}

export async function addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    ...customer,
  };
  customers.push(newCustomer);
  return Promise.resolve(newCustomer);
}

export async function getCashTransactions(): Promise<CashTransaction[]> {
  return Promise.resolve(cashTransactions);
}
