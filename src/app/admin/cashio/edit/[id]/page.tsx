
import { getCashTransactionById, getAccounts } from '@/lib/data';
import CashTransactionForm from '../../components/CashTransactionForm';
import { notFound } from 'next/navigation';

export default async function EditCashTransactionPage({ params }: { params: { id: string } }) {
  const transaction = await getCashTransactionById(params.id);
  const accounts = await getAccounts();

  if (!transaction) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Cash Transaction</h1>
      <CashTransactionForm transaction={transaction} accounts={accounts} />
    </div>
  );
}
