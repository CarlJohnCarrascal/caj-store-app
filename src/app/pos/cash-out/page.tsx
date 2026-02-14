'use client';
import CashTransactionForm from '@/app/admin/cashio/components/CashTransactionForm';
import { getAccounts } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Account } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function PosCashOutPage() {
    const { activeStoreId } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        if (!activeStoreId) {
            setIsLoading(false);
            return;
        }
        async function fetchAccounts() {
            const fetchedAccounts = await getAccounts(activeStoreId!);
            setAccounts(fetchedAccounts);
            setIsLoading(false);
        }
        fetchAccounts();
    }, [activeStoreId]);

    if (isLoading) {
        return <Skeleton className="h-[600px] w-full" />
    }

    return (
        <div>
            <CashTransactionForm accounts={accounts} transaction={{ transactionType: 'Cash Out' }} />
        </div>
    );
}
