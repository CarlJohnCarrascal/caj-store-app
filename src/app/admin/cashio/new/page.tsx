import { getAccounts } from '@/lib/data';
import CashTransactionForm from '../components/CashTransactionForm';

export default async function NewCashTransactionPage() {
  const accounts = await getAccounts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Cash Transaction</h1>
      <CashTransactionForm accounts={accounts} />
    </div>
  );
}
