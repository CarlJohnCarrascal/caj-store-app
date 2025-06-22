import { getCustomers, getCollectionNames } from '@/lib/data';
import CollectionForm from '../components/CollectionForm';

export default async function NewCollectionPage() {
  const customers = await getCustomers();
  const collectionNames = await getCollectionNames();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Add New Collection</h1>
      <CollectionForm customers={customers} collectionNames={collectionNames} />
    </div>
  );
}
