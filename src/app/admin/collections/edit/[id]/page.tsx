import { getCollectionById, getCustomers, getCollectionNames } from '@/lib/data';
import CollectionForm from '../../components/CollectionForm';
import { notFound } from 'next/navigation';

export default async function EditCollectionPage({ params }: { params: { id: string } }) {
  const collection = await getCollectionById(params.id);
  const customers = await getCustomers();
  const collectionNames = await getCollectionNames();

  if (!collection) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit Collection</h1>
      <CollectionForm collection={collection} customers={customers} collectionNames={collectionNames} />
    </div>
  );
}
