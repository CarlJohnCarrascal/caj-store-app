import TransactionList from './components/TransactionList';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Activity Feed</h1>
      </div>
      <TransactionList />
    </div>
  );
}
