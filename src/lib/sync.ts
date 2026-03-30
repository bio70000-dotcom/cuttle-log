import { db } from '@/db/schema'
import { getSupabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// Dexie table name → Supabase table name
const TABLE_MAP: Record<string, string> = {
  trips: 'trips',
  catch_events: 'catch_events',
  track_points: 'track_points',
  rig_presets: 'rig_presets',
  egi_presets: 'egi_presets',
  rod_presets: 'rod_presets',
  spots: 'spots',
  conditions: 'condition_snapshots',
}

const LAST_SYNC_KEY = 'last_sync_at'

export async function getLastSyncAt(): Promise<Date | null> {
  const row = await db.settings.where('key').equals(LAST_SYNC_KEY).first()
  if (!row) return null
  const ts = Number(row.value)
  return isNaN(ts) ? null : new Date(ts)
}

export async function setLastSyncAt(date: Date): Promise<void> {
  const existing = await db.settings.where('key').equals(LAST_SYNC_KEY).first()
  if (existing?.id != null) {
    await db.settings.update(existing.id, { value: String(date.getTime()) })
  } else {
    await db.settings.add({ key: LAST_SYNC_KEY, value: String(date.getTime()) })
  }
}

export async function processOutbox(): Promise<{ synced: number; failed: number }> {
  const supabase = getSupabase()
  const user = useAuthStore.getState().user

  if (!supabase || !user) return { synced: 0, failed: 0 }

  const items = await db.outbox.toArray()
  if (items.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const item of items) {
    const supabaseTable = TABLE_MAP[item.entityType]
    if (!supabaseTable) {
      // Unknown entity type — remove from outbox silently
      if (item.id != null) await db.outbox.delete(item.id)
      continue
    }

    try {
      const payload = item.payload as Record<string, unknown>
      const row = {
        ...payload,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from(supabaseTable)
        .upsert(row, { onConflict: 'user_id,local_id' })

      if (error) throw new Error(error.message)

      if (item.id != null) await db.outbox.delete(item.id)
      synced++
    } catch (err) {
      if (item.id != null) {
        await db.outbox.update(item.id, {
          tryCount: item.tryCount + 1,
          lastError: err instanceof Error ? err.message : 'Unknown error',
        })
      }
      failed++
    }
  }

  return { synced, failed }
}

export async function pullRemoteChanges(lastSyncAt: Date): Promise<void> {
  const supabase = getSupabase()
  const user = useAuthStore.getState().user

  if (!supabase || !user) return

  const isoDate = lastSyncAt.toISOString()

  const pulls: Array<{ supabaseTable: string; dexieTable: keyof typeof db }> = [
    { supabaseTable: 'trips', dexieTable: 'trips' },
    { supabaseTable: 'catch_events', dexieTable: 'catchEvents' },
    { supabaseTable: 'track_points', dexieTable: 'trackPoints' },
    { supabaseTable: 'rig_presets', dexieTable: 'rigPresets' },
    { supabaseTable: 'egi_presets', dexieTable: 'egiPresets' },
    { supabaseTable: 'rod_presets', dexieTable: 'rodPresets' },
    { supabaseTable: 'spots', dexieTable: 'spots' },
    { supabaseTable: 'condition_snapshots', dexieTable: 'conditions' },
  ]

  for (const { supabaseTable, dexieTable } of pulls) {
    try {
      const { data, error } = await supabase
        .from(supabaseTable)
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', isoDate)

      if (error || !data) continue

      const table = db[dexieTable] as ReturnType<typeof db.table>

      for (const row of data) {
        const localId: number | undefined = row.local_id
        if (localId == null) continue

        const existing = await table.get(localId)

        const remoteUpdatedAt = new Date(row.updated_at as string)
        const localUpdatedAt = (existing as Record<string, unknown> | undefined)
          ?.updated_at as Date | undefined

        // last-write-wins: only update if remote is newer
        if (!existing || !localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
          const { user_id: _uid, local_id: _lid, updated_at: _uat, created_at: _cat, ...rest } = row
          await table.put({ ...rest, id: localId })
        }
      }
    } catch {
      // swallow per-table errors — don't block other tables
    }
  }
}

export async function fullSync(): Promise<{ synced: number; failed: number }> {
  const supabase = getSupabase()
  const user = useAuthStore.getState().user

  if (!supabase || !user) return { synced: 0, failed: 0 }

  const result = await processOutbox()

  const lastSyncAt = await getLastSyncAt()
  const since = lastSyncAt ?? new Date(0)
  await pullRemoteChanges(since)

  await setLastSyncAt(new Date())

  return result
}

export async function syncOutbox(): Promise<{ success: boolean; synced: number; failed: number }> {
  const result = await processOutbox()
  return { success: result.failed === 0, ...result }
}

export async function queueForSync(entityType: string, payload: unknown): Promise<void> {
  await db.outbox.add({
    entityType,
    payload,
    createdAt: new Date(),
    tryCount: 0,
  })
}

// Auto-sync on network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    fullSync().catch(() => {
      // silently handle — offline-first, sync is best-effort
    })
  })
}
