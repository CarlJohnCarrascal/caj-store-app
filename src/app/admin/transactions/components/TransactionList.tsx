'use client';

import { ActivityLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { Package, Users, Library, Landmark, ShoppingCart, History, PlusCircle, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface TransactionListProps {
  activities: ActivityLog[];
}

const typeIcons: { [key: string]: React.ReactNode } = {
  Product: <Package className="h-5 w-5" />,
  Customer: <Users className="h-5 w-5" />,
  Collection: <Library className="h-5 w-5" />,
  Account: <Landmark className="h-5 w-5" />,
  Order: <ShoppingCart className="h-5 w-5" />,
  CashIO: <ArrowRightLeft className="h-5 w-5" />,
};

const actionIcons = {
  Created: <PlusCircle className="h-4 w-4 text-green-500" />,
  Updated: <Pencil className="h-4 w-4 text-blue-500" />,
  Deleted: <Trash2 className="h-4 w-4 text-red-500" />,
};

const actionColors = {
  Created: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
  Updated: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  Deleted: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
};

export default function TransactionList({ activities }: TransactionListProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No activity recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-4 p-4 hover:bg-muted/50">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {typeIcons[activity.type] || <History className="h-5 w-5" />}
              </div>
              <div className="flex-grow">
                <p className="font-medium text-foreground">{activity.details}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-1">
                  <Badge variant="outline" className={cn("font-normal h-6", actionColors[activity.action])}>
                    <span className="mr-1.5">{actionIcons[activity.action]}</span>
                    {activity.action}
                  </Badge>
                  <span className="hidden sm:inline">&middot;</span>
                  <span className="font-semibold">{activity.type}</span>
                   <span className="hidden sm:inline">&middot;</span>
                   <span title={isMounted ? format(activity.timestamp, 'PPpp') : ''}>
                     {isMounted ? `${formatDistanceToNow(activity.timestamp)} ago` : '...'}
                   </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
