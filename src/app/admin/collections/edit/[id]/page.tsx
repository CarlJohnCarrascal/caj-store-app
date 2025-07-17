
'use client';

import { getCollectionById, getCustomers, getCollectionNames } from '@/lib/data';
import CollectionForm from '../../components/CollectionForm';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Customer, Collection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function EditCollectionPage() {
  const params = useParams();
  const id = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collectionNames, setCollectionNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
        setIsLoading(false);
        setError("Collection ID is missing from the URL.");
        return;
    };

    async function fetchData() {
      try {
        const [collectionData, customersData, collectionNamesData] = await Promise.all([
          getCollectionById(id),
          getCustomers(),
          getCollectionNames(),
        ]);
        
        if (!collectionData) {
          notFound();
          return;
        }

        setCollection(collectionData);
        setCustomers(customersData);
        setCollectionNames(collectionNamesData);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to load collection data. You may not have permission to view this page or your session has expired.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6"><Skeleton className="h-9 w-64" /></h1>
        <Card>
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="mt-4 border-destructive">
        <CardHeader>
          <h1 className="text-destructive">An Error Occurred</h1>
        </CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Collection</h1>
      {collection && <CollectionForm collection={collection} customers={customers} collectionNames={collectionNames} />}
    </div>
  );
}
