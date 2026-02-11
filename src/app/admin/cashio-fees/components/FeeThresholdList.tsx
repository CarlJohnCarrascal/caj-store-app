
'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { FeeThreshold } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteFeeThresholdAction } from '@/lib/actions';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import FeeThresholdForm from './FeeThresholdForm';
import { getStoreData, setStoreData, deleteItem } from '@/lib/offline';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { deleteFeeThreshold, logActivity } from '@/lib/data';

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

export default function FeeThresholdList() {
  const [thresholds, setThresholds] = useState<FeeThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user, activeStoreId } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<FeeThreshold | undefined>(undefined);

  useEffect(() => {
    if (!activeStoreId) {
        setIsLoading(false);
        return;
    }
    const loadFromCache = async () => {
      const cachedData = await getStoreData<FeeThreshold>('feeThresholds');
      if (cachedData.length > 0) {
        setThresholds(cachedData);
        setIsLoading(false);
      }
    };
    loadFromCache();
    
    const thresholdsRef = ref(db, `storeData/${activeStoreId}/feeThresholds`);
    const unsubscribe = onValue(thresholdsRef, (snapshot) => {
      const thresholdList = snapshotToArray<FeeThreshold>(snapshot);
      setThresholds(thresholdList);
      setIsLoading(false);
      setStoreData('feeThresholds', thresholdList);
    }, (error) => {
      console.error("Firebase listener failed:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeStoreId]);

  const sortedThresholds = useMemo(() => {
    return [...thresholds].sort((a, b) => a.from - b.from);
  }, [thresholds]);

  const handleDelete = (id: string) => {
    if (!user || !activeStoreId) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to delete thresholds.' });
      return;
    }
    startTransition(async () => {
      try {
        await deleteFeeThreshold(activeStoreId, id);
        await logActivity({
            type: 'FeeThreshold',
            action: 'Deleted',
            details: `Fee threshold was deleted.`,
            targetId: id,
            userId: user.uid,
            userName: user.displayName || user.email!,
        });
        await deleteFeeThresholdAction();
        await deleteItem('feeThresholds', id);
        toast({ title: 'Success', description: 'Fee threshold deleted successfully.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete threshold.' });
      }
    });
  };
  
  const handleEdit = (threshold: FeeThreshold) => {
      setEditingThreshold(threshold);
      setIsFormOpen(true);
  }

  const handleAddNew = () => {
      setEditingThreshold(undefined);
      setIsFormOpen(true);
  }

  const onFormSuccess = () => {
    setIsFormOpen(false);
    setEditingThreshold(undefined);
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }
  
  return (
    <>
    <Card>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-xl font-semibold">Fee Thresholds</h2>
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New
        </Button>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount From</TableHead>
              <TableHead>Amount To</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedThresholds.length > 0 ? (
              sortedThresholds.map((threshold) => (
                <TableRow key={threshold.id}>
                  <TableCell className="font-mono">₱{threshold.from.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">₱{threshold.to.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">₱{threshold.fee.toFixed(2)}</TableCell>
                  <TableCell>
                    {threshold.type === 'fixed' ? 'Fixed' : 'Per ₱1000'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{threshold.notes || '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(threshold)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this fee threshold. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(threshold.id)}
                              disabled={isPending}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {isPending ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No fee thresholds defined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingThreshold ? 'Edit Fee Threshold' : 'Create Fee Threshold'}</DialogTitle>
                <DialogDescription>Define a rule for calculating transaction fees.</DialogDescription>
            </DialogHeader>
            <FeeThresholdForm 
                threshold={editingThreshold} 
                onSuccess={onFormSuccess} 
                onCancel={() => setIsFormOpen(false)}
            />
        </DialogContent>
    </Dialog>
    </>
  );
}
