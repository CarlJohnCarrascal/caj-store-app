'use client';
import AccountList from './components/AccountList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Store } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function AccountsPage() {
  const { activeStore } = useAuth();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Accounts</h1>
        {activeStore && (
          <Button asChild>
            <Link href="/admin/accounts/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Link>
          </Button>
        )}
      </div>
      {activeStore ? (
        <AccountList />
      ) : (
        <div className="text-center p-8 border rounded-lg">
          <Store className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold mt-4">No Store Selected</h3>
          <p className="text-muted-foreground mt-2">Please create or select a store to manage accounts.</p>
           <Button asChild className="mt-4">
            <Link href="/admin/stores">
              Manage Stores
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
