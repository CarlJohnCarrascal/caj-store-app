
'use client';

import { getCustomers, getCollectionNames } from '@/lib/data';
import CollectionForm from '../components/CollectionForm';
import { useEffect, useState } from 'react';
import { Customer } from '@/lib/types';

export default function NewCollectionPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collectionNames, setCollectionNames] = useState<string[]>([]);
  
  useEffect(() => {
    async function fetchData() {
        const [customersData, namesData] = await Promise.all([
            getCustomers(),
            getCollectionNames()
        ]);
        setCustomers(customersData);
        setCollectionNames(namesData);
    }
    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Collection</h1>
      <CollectionForm customers={customers} collectionNames={collectionNames} />
    </div>
  );
}
