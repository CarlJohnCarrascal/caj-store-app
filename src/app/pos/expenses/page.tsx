
'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import ExpenseList from '@/app/admin/expenses/components/ExpenseList';

export default function PosExpensesPage() {
  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Button asChild>
          <Link href="/pos/expenses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
      </div>
      <div className="flex-grow overflow-auto">
        <ExpenseList />
      </div>
    </div>
  );
}
