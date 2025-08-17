
'use client';

import { getCashTransactionById, getAccounts } from '@/lib/data';
import CashTransactionForm from '../../components/CashTransactionForm';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Account, CashTransaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteReceiptImageAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function EditCashTransactionPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState<CashTransaction | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!id) {
        setIsLoading(false);
        setError("Transaction ID is missing from the URL.");
        return;
    };

    async function fetchData() {
      try {
        const [transactionData, accountsData] = await Promise.all([
          getCashTransactionById(id),
          getAccounts(),
        ]);
        
        if (!transactionData) {
          notFound();
          return;
        }

        const formattedTransaction = {
          ...transactionData,
          datetime: transactionData.transactionDate ? transactionData.transactionDate.slice(0, 16) : '',
        };

        setTransaction(formattedTransaction as CashTransaction);
        setAccounts(accountsData);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load transaction data. You may not have permission to view this page or your session has expired.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleDeleteImage = async () => {
    if (!transaction || !transaction.receiptImageUrl || !user) return;
    
    startDeleteTransition(async () => {
      try {
        await deleteReceiptImageAction(transaction.id, { userId: user.uid, userName: user.displayName || user.email! });
        setTransaction(prev => prev ? { ...prev, receiptImageUrl: undefined } : null);
        toast({ title: "Success", description: "Receipt image has been deleted." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete image." });
      }
    });
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6"><Skeleton className="h-9 w-72" /></h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
             <Skeleton className="h-[500px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">An Error Occurred</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Cash Transaction</h1>
      
      {transaction?.receiptImageUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Receipt Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative h-32 w-32 rounded-md overflow-hidden border-2 border-dashed cursor-pointer"
                onClick={() => setIsImageModalOpen(true)}
              >
                <Image
                  src={transaction.receiptImageUrl}
                  alt="Transaction Receipt"
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            </CardContent>
            <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Deleting...' : 'Delete Image'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the receipt image from storage. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteImage} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        Confirm Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
          </Card>
      )}

      {transaction && <CashTransactionForm transaction={transaction} accounts={accounts} />}
      
      {transaction?.receiptImageUrl && (
          <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
            <DialogContent className="max-w-4xl h-[90vh]">
              <DialogHeader>
                  <DialogTitle>Receipt Preview</DialogTitle>
              </DialogHeader>
              <div className="relative w-full h-full">
                <Image
                    src={transaction.receiptImageUrl}
                    alt="Transaction Receipt"
                    fill
                    className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
