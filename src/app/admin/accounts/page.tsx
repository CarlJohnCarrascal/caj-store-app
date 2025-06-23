import AccountList from './components/AccountList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Accounts</h1>
        <Button asChild>
          <Link href="/admin/accounts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Account
          </Link>
        </Button>
      </div>
      <AccountList />
    </div>
  );
}
