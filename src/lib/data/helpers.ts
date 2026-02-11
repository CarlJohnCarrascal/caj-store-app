// Helper function to convert Firebase snapshot to an array
export function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
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

export function getCostAndFeeFromDescription(description: string): { cost: number, fee: number } {
    const costMatch = description.match(/Cost: ₱([\d,]+\.\d{2})/);
    const feeMatch = description.match(/Fee: ₱([\d,]+\.\d{2})/);
    const cost = costMatch?.[1] ? parseFloat(costMatch[1].replace(/,/g, '')) : 0;
    const fee = feeMatch?.[1] ? parseFloat(feeMatch[1].replace(/,/g, '')) : 0;
    return { cost, fee };
}
