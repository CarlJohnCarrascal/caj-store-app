import { getCustomers } from '@/lib/data';
import CustomerList from './components/CustomerList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default async function CustomersPage() {
  const customers = await getCustomers();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Button asChild>
          <Link href="/admin/customers/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>
      <CustomerList customers={customers} />
    </div>
  );
}
