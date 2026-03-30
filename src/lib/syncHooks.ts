import type { Table } from 'dexie'
import { db } from '@/db/schema'
import { isSupabaseConfigured } from '@/lib/supabase'
import { queueForSync } from '@/lib/sync'

type EntityType =
  | 'trips'
  | 'catch_events'
  | 'track_points'
  | 'rig_presets'
  | 'egi_presets'
  | 'rod_presets'
  | 'spots'
  | 'conditions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hookTable<T>(tableName: EntityType, table: Table<T, any>) {
  table.hook('creating', function (_primKey, obj) {
    if (!isSupabaseConfigured()) return
    const snapshot = { ...(obj as Record<string, unknown>) }
    Promise.resolve().then(() => {
      queueForSync(tableName, snapshot).catch(() => {
        // best-effort
      })
    })
  })

  table.hook('updating', function (modifications, primKey, obj) {
    if (!isSupabaseConfigured()) return
    const snapshot = {
      ...(obj as Record<string, unknown>),
      ...(modifications as Record<string, unknown>),
      local_id: primKey,
    }
    Promise.resolve().then(() => {
      queueForSync(tableName, snapshot).catch(() => {
        // best-effort
      })
    })
  })
}

export function initSyncHooks() {
  hookTable('trips', db.trips)
  hookTable('catch_events', db.catchEvents)
  hookTable('track_points', db.trackPoints)
  hookTable('rig_presets', db.rigPresets)
  hookTable('egi_presets', db.egiPresets)
  hookTable('rod_presets', db.rodPresets)
  hookTable('spots', db.spots)
  hookTable('conditions', db.conditions)
}
