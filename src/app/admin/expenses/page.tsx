import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import ExpenseList from './components/ExpenseList';

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Expenses</h1>
        <Button asChild>
          <Link href="/admin/expenses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
      </div>
      <ExpenseList />
    </div>
  );
}
