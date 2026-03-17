'use client';

import { ActivityLog } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { Sparkles, Clock, User, Fingerprint } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, query, limitToLast, orderByKey, get, endBefore } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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

const ITEMS_PER_PAGE = 50;

export default function AIUsageList() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [lastLoadedKey, setLastLoadedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const activitiesRef = query(ref(db, 'activityLogs'), orderByKey(), limitToLast(ITEMS_PER_PAGE * 2));
    const unsubscribe = onValue(activitiesRef, (snapshot) => {
      const logs = snapshotToArray<ActivityLog>(snapshot);
      const aiLogs = logs.filter(log => log.type === 'AI');
      const logsWithDates = aiLogs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
      setActivities(logsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      
      if (logs.length > 0) {
        setLastLoadedKey(logs[0].id);
      }
      setHasMore(logs.length === ITEMS_PER_PAGE * 2);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoadMore = async () => {
    if (!lastLoadedKey || !hasMore) return;

    setIsFetchingMore(true);
    const activitiesRef = query(ref(db, 'activityLogs'), orderByKey(), endBefore(lastLoadedKey), limitToLast(ITEMS_PER_PAGE * 2));
    
    const snapshot = await get(activitiesRef);
    const newLogs = snapshotToArray<ActivityLog>(snapshot);
    const newAiLogs = newLogs.filter(log => log.type === 'AI');

    if (newAiLogs.length > 0) {
      const newLogsWithDates = newAiLogs.map(log => ({ ...log, timestamp: new Date(log.timestamp) }));
      setActivities(prev => [...prev, ...newLogsWithDates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())]);
      setLastLoadedKey(newLogs[0].id);
      setHasMore(newLogs.length === ITEMS_PER_PAGE * 2);
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
                     {[...Array(10)].map((_, i) => (
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
          No AI usage has been recorded yet.
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
                className="flex items-start gap-4 p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-foreground">{activity.details}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1.5"><User className="h-4 w-4"/> {activity.userName}</div>
                    <div className="flex items-center gap-1.5"><Fingerprint className="h-4 w-4"/> {activity.userId}</div>
                    <div className="flex items-center gap-1.5" title={isMounted ? format(activity.timestamp, 'PPpp') : ''}>
                      <Clock className="h-4 w-4" />
                      {isMounted ? `${formatDistanceToNow(activity.timestamp)} ago` : '...'}
                    </div>
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
    </>
  );
}
