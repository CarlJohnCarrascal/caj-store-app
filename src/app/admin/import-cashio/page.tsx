'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileCheck, Filter, FilterX } from 'lucide-react';
import { extractCashioPdf, PdfTransaction } from '@/ai/flows/extract-cashio-pdf';
import { getAccounts, logAIUsage } from '@/lib/data';
import { Account } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';

export default function ImportCashioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<PdfTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filterInternal, setFilterInternal] = useState(true);
  const { toast } = useToast();
  const { user, appUser, activeStoreId } = useAuth();

  useEffect(() => {
    async function fetchAccounts() {
      if (!activeStoreId) return;
      const fetchedAccounts = await getAccounts(activeStoreId);
      setAccounts(fetchedAccounts);
    }
    fetchAccounts();
  }, [activeStoreId]);

  const ownAccountNumbers = useMemo(() => {
    return new Set(accounts.map(acc => acc.accountNumber.replace(/\D/g, '')));
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    if (!filterInternal) {
      return transactions;
    }

    return transactions.filter(tx => {
      const transferMatches = tx.description.match(/Transfer from (\d+) to (\d+)/);
      if (transferMatches) {
        const fromAccount = transferMatches[1];
        const toAccount = transferMatches[2];
        if (ownAccountNumbers.has(fromAccount) && ownAccountNumbers.has(toAccount)) {
          return false; // This is an internal transfer, so filter it out
        }
      }
      return true; // Keep all other transactions
    });
  }, [transactions, filterInternal, ownAccountNumbers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      setFile(null);
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please select a PDF file.',
      });
    }
  };

  const handleProcessPdf = async () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No File Selected', description: 'Please select a PDF file to process.' });
      return;
    }

    setIsProcessing(true);
    setTransactions([]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        try {
          const pdfDataUri = e.target?.result as string;
          if (!pdfDataUri) {
            throw new Error('Failed to read file.');
          }

          const result = await extractCashioPdf({ pdfDataUri });

          if (result && result.transactions) {
            setTransactions(result.transactions);
            toast({
              title: 'Processing Complete',
              description: `Successfully extracted ${result.transactions.length} transactions.`,
            });
            if (user && appUser && result.usage) {
              logAIUsage({ userId: user.uid, userName: appUser.name, flowName: 'extractCashioPdf', usage: result.usage });
            }
          } else {
            throw new Error('AI did not return valid transaction data.');
          }
        } catch (aiError: any) {
          toast({
            variant: 'destructive',
            title: 'AI Processing Failed',
            description: aiError.message || 'Could not extract data from the PDF.',
          });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setIsProcessing(false);
        toast({
            variant: 'destructive',
            title: 'File Read Error',
            description: 'There was an error reading the selected file.',
        });
      };
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import CashIO PDF</CardTitle>
          <CardDescription>Upload a GCash Transaction History PDF to extract transactions using AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <Label htmlFor="pdf-upload">PDF File</Label>
              <Input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} />
            </div>
            <Button onClick={handleProcessPdf} disabled={isProcessing || !file} className="self-end">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Processing...' : 'Process PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Transactions</CardTitle>
            <div className="flex justify-between items-center">
              <CardDescription>
                Review the transactions extracted from the PDF.
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Switch
                  id="filter-internal"
                  checked={filterInternal}
                  onCheckedChange={setFilterInternal}
                />
                <Label htmlFor="filter-internal" className="flex items-center gap-2 text-sm">
                  {filterInternal ? <FilterX className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  <span>Filter Internal Transfers</span>
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference No.</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell>{tx.dateTime}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className="font-mono">{tx.referenceNo}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {tx.debit !== undefined ? `₱${tx.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {tx.credit !== undefined ? `₱${tx.credit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">₱{tx.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
