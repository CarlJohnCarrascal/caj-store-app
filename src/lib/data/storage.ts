import { storage } from '../firebase';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

export async function finalizeReceiptImage(storeId: string, dataUrl: string, folder: 'cashin' | 'cashout', fileName: string): Promise<string> {
  const mainfolder = process.env.IMAGE_FOLDER || 'receipts';
  const path = `${mainfolder}/${storeId}/${folder}/${fileName}`;
    const imageRef = storageRef(storage, path);
    // Directly upload the data URL string
    const snapshot = await uploadString(imageRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
}

export async function deleteReceiptImage(storeId: string, transactionId: string, imageUrl: string): Promise<void> {
    // 1. Delete from storage
    const imageStorageRef = storageRef(storage, imageUrl);
    await deleteObject(imageStorageRef);

    // 2. Remove from database (This is done in the component calling this, which is not ideal but we follow the pattern)
    // The component will call updateCashTransaction with receiptImageUrl: null
}
