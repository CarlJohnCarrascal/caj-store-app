'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Collection } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { deleteCollectionAction } from '@/lib/actions';
import { Copy, Pencil, Trash2, User } from 'lucide-react';

interface CollectionListProps {
  collections: Collection[];
}

export default function CollectionList({ collections }: CollectionListProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleCopy = (value: number) => {
    navigator.clipboard.writeText(String(value));
    toast({
      title: 'Copied to clipboard!',
      description: `Value ₱${value.toFixed(2)} has been copied.`,
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCollectionAction(id);
        toast({ title: 'Success', description: 'Collection deleted successfully.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete collection.' });
      }
    });
  };

  if (collections.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold">No Collections Found</h3>
        <p className="text-muted-foreground mt-2">Start by adding a new collection to track.</p>
         <Button asChild className="mt-4">
          <Link href="/admin/collections/new">
            Add Collection
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((collection) => (
        <Card key={collection.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="line-clamp-2">{collection.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
                <User className="h-4 w-4" />
                {collection.customerName}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="text-3xl font-bold text-primary mb-2">
                ₱{collection.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {collection.note && (
                <p className="text-sm text-muted-foreground italic">
                    &quot;{collection.note}&quot;
                </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
             <Button variant="outline" size="sm" onClick={() => handleCopy(collection.value)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Value
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href={`/admin/collections/edit/${collection.id}`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this collection record. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(collection.id)}
                    disabled={isPending}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
