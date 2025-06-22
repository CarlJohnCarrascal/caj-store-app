import { getCustomers } from '@/lib/data';
import CustomerList from './components/CustomerList';

export default async function CustomersPage() {
  const customers = await getCustomers();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
      </div>
      <CustomerList customers={customers} />
    </div>
  );
}
