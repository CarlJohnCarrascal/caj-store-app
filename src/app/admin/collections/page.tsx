import { getCollections } from '@/lib/data';
import CollectionList from './components/CollectionList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default async function CollectionsPage() {
  const collections = await getCollections();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Collections</h1>
        <Button asChild>
          <Link href="/admin/collections/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Collection
          </Link>
        </Button>
      </div>
      <CollectionList collections={collections} />
    </div>
  );
}
