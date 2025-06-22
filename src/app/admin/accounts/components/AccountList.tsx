'use client';

import { Account } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountListProps {
  accounts: Account[];
}

export default function AccountList({ accounts }: AccountListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accounts.length > 0 ? (
            accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <div className="bg-muted p-3 rounded-full">
                        <Landmark className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold text-lg">{account.accountName}</p>
                        <p className="text-sm text-muted-foreground">{account.bankName} &middot; {account.accountNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <p className={cn(
                      "font-semibold text-xl",
                       account.balance >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      ₱{account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No accounts found. Start by adding one.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
