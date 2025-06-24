'use client';

import { ActivityLog } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { Package, Users, Library, Landmark, ShoppingCart, History, PlusCircle, Pencil, Trash2, ArrowRightLeft, Clock, Info, ShieldQuestion, Tag, Fingerprint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, query, limitToLast, orderByKey, get, endBefore } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const items: (T & { id: string })[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot: any) => {
      items.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });
  }
  return items;
}

const ITEMS_PER_PAGE = 20;

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

export default function ActivityList() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastLoadedKey, setLastLoadedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const activitiesRef = query(ref(db, 'activityLogs'), orderByKey(), limitToLast(ITEMS_PER_PAGE));
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      const logs = snapshotToArray<ActivityLog>(snapshot);
      const logsWithDates = logs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
      setActivities(logsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      
      if (logs.length > 0) {
        setLastLoadedKey(logs[0].id); // The oldest key is the first one in the original snapshot
      }
      setHasMore(logs.length === ITEMS_PER_PAGE);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoadMore = async () => {
    if (!lastLoadedKey || !hasMore) return;

    setIsFetchingMore(true);
    const activitiesRef = query(ref(db, 'activityLogs'), orderByKey(), endBefore(lastLoadedKey), limitToLast(ITEMS_PER_PAGE));
    
    const snapshot = await get(activitiesRef);
    const newLogs = snapshotToArray<ActivityLog>(snapshot);

    if (newLogs.length > 0) {
      const newLogsWithDates = newLogs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
      setActivities(prev => [...prev, ...newLogsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())]);
      setLastLoadedKey(newLogs[0].id);
      setHasMore(newLogs.length === ITEMS_PER_PAGE);
    } else {
      setHasMore(false);
    }

    setIsFetchingMore(false);
  }

  if (isLoading) {
      return (
          <Card>
              <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                     {[...Array(5)].map((_, i) => (
                        <li key={i} className="flex items-start gap-4 p-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-grow space-y-2">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </li>
                     ))}
                  </ul>
              </CardContent>
          </Card>
      )
  }

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
    <>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {activities.map((activity) => (
              <li 
                key={activity.id} 
                className="flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedActivity(activity)}
              >
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
        {hasMore && (
            <CardFooter className="p-4 border-t">
                <Button 
                    className="w-full"
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isFetchingMore}
                >
                    {isFetchingMore ? 'Loading...' : 'Load More'}
                </Button>
            </CardFooter>
        )}
      </Card>

      <Dialog open={!!selectedActivity} onOpenChange={(isOpen) => !isOpen && setSelectedActivity(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>A detailed view of the recorded activity.</DialogDescription>
          </DialogHeader>
          {selectedActivity && isMounted && (
            <div className="grid gap-4 py-4 text-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Timestamp</div>
                    <span className="font-mono text-right">{format(selectedActivity.timestamp, 'MMM d, yyyy, h:mm:ss a')}</span>
                </div>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><Info className="h-4 w-4" /> Details</div>
                    <p className="text-right max-w-[70%]">{selectedActivity.details}</p>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><ShieldQuestion className="h-4 w-4" /> Action</div>
                    <Badge variant="outline" className={cn("font-normal", actionColors[selectedActivity.action])}>
                        {actionIcons[selectedActivity.action]}
                        <span className="ml-1.5">{selectedActivity.action}</span>
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><Tag className="h-4 w-4" /> Type</div>
                    <span>{selectedActivity.type}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><Fingerprint className="h-4 w-4" /> Target ID</div>
                    <span className="font-mono text-xs">{selectedActivity.targetId}</span>
                </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedActivity(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
