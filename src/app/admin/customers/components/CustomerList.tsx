'use client';

import { useState, useMemo } from 'react';
import { Customer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerListProps {
  customers: Customer[];
}

export default function CustomerList({ customers }: CustomerListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedTerm) ||
      customer.location.toLowerCase().includes(lowercasedTerm)
    );
  }, [customers, searchTerm]);

  return (
    <Card>
      <div className="flex items-center border-b p-2 gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-none focus-visible:ring-0 shadow-none"
          />
        </div>
        <Button variant="ghost" size="icon" disabled>
          <Filter className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled>
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
              <div key={customer.id} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
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
