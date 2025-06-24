'use client';

import { useState, useMemo, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
    const items: (T & { id: string })[] = [];
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot: any) => {
        items.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
        });
        });
    }
    return items;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  
  useEffect(() => {
    const customersRef = ref(db, 'customers');
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const customerList = snapshotToArray<Customer>(snapshot);
      setCustomers(customerList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = [...customers];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(lowercasedTerm) ||
        customer.location.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    if (showFilter === 'with-balance') {
        filtered = filtered.filter(customer => customer.balance > 0);
    } else if (showFilter === 'with-negative-balance') {
        filtered = filtered.filter(customer => customer.balance < 0);
    }

    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'balance-asc':
                return a.balance - b.balance;
            case 'balance-desc':
                return b.balance - a.balance;
            case 'name-asc':
            default:
                return a.name.localeCompare(b.name);
        }
    });

    return filtered;
  }, [customers, searchTerm, showFilter, sortBy]);

  if (isLoading) {
    return (
       <Card>
            <Skeleton className="h-16 w-full" />
            <div className="p-0">
                <div className="divide-y">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4">
                            <div>
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-24 mt-2" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col md:flex-row items-center justify-between border-b p-4 gap-4">
        <div className="relative flex-grow w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Select value={showFilter} onValueChange={setShowFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Show all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All Customers</SelectItem>
              <SelectItem value="with-balance">With Positive Balance</SelectItem>
              <SelectItem value="with-negative-balance">With Negative Balance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="balance-asc">Balance (Low-High)</SelectItem>
              <SelectItem value="balance-desc">Balance (High-Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {filteredAndSortedCustomers.length > 0 ? (
            filteredAndSortedCustomers.map(customer => (
              <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="block">
                <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.location}</p>
                  </div>
                  <p className={cn(
                    "font-semibold text-lg",
                    customer.balance > 0 && "text-green-600",
                    customer.balance < 0 && "text-destructive"
                  )}>
                    ₱{customer.balance.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No customers found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
