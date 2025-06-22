'use client';

import { useState, useMemo } from 'react';
import { Customer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerListProps {
  customers: Customer[];
}

export default function CustomerList({ customers }: CustomerListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');

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
          <Button variant="outline" size="icon" disabled>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {filteredAndSortedCustomers.length > 0 ? (
            filteredAndSortedCustomers.map(customer => (
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
