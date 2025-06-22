import { getActivities } from '@/lib/data';
import TransactionList from './components/TransactionList';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const activities = await getActivities();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Activity Feed</h1>
      </div>
      <TransactionList activities={activities} />
    </div>
  );
}
