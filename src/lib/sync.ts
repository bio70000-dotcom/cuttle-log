import { db } from '@/db/schema';

// TODO: Replace with actual backend endpoint
const SYNC_ENDPOINT = '/api/sync';

export async function syncOutbox() {
  const items = await db.outbox.toArray();
  
  if (items.length === 0) {
    console.log('Sync: No items in outbox');
    return { success: true, synced: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // TODO: Replace this stub with actual API call
      // For now, simulate a successful sync after a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`Sync: Successfully synced ${item.entityType}`, item.payload);
      
      // Remove from outbox on success
      await db.outbox.delete(item.id!);
      synced++;
    } catch (error) {
      console.error(`Sync: Failed to sync item ${item.id}`, error);
      
      // Update error count
      await db.outbox.update(item.id!, {
        tryCount: item.tryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
      
      failed++;
    }
  }

  console.log(`Sync complete: ${synced} synced, ${failed} failed`);
  
  return { success: failed === 0, synced, failed };
}

export async function queueForSync(entityType: string, payload: any) {
  await db.outbox.add({
    entityType,
    payload,
    createdAt: new Date(),
    tryCount: 0,
  });
  
  console.log(`Queued for sync: ${entityType}`, payload);
}

// Auto-sync on network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Network reconnected, attempting sync...');
    syncOutbox();
  });
}
