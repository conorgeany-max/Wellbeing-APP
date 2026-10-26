import type { Config } from '@netlify/functions';
import { requireAccess } from '../lib/auth.mts';
import { SNAPSHOT_KEY, syncStore, type Snapshot } from '../lib/store.mts';

// The cloud copy of all data is one JSON snapshot. The app merges it with its
// local data (newest change wins per record) and writes it back with the ETag
// it read, so two devices syncing at once can't overwrite each other.
export default async (req: Request) => {
  const denied = requireAccess(req);
  if (denied) return denied;
  const store = syncStore();

  if (req.method === 'GET') {
    const found = await store.getWithMetadata(SNAPSHOT_KEY, { type: 'json' });
    if (!found) return Response.json({ snapshot: null, etag: null });
    return Response.json({ snapshot: found.data as Snapshot, etag: found.etag ?? null });
  }

  if (req.method === 'PUT') {
    const etag = req.headers.get('if-match');
    const snapshot = (await req.json()) as Snapshot;
    if (snapshot?.version !== 1 || typeof snapshot.records !== 'object') {
      return Response.json({ error: 'Invalid snapshot.' }, { status: 400 });
    }
    // No ETag means either a first upload, or a storage backend that didn't
    // return one (local emulation); the app says which with x-sync-mode.
    const result = etag
      ? await store.setJSON(SNAPSHOT_KEY, snapshot, { onlyIfMatch: etag })
      : req.headers.get('x-sync-mode') === 'overwrite'
        ? await store.setJSON(SNAPSHOT_KEY, snapshot)
        : await store.setJSON(SNAPSHOT_KEY, snapshot, { onlyIfNew: true });
    if (!result.modified) return Response.json({ error: 'Changed on another device. Sync again.' }, { status: 412 });
    return Response.json({ etag: result.etag ?? null });
  }

  if (req.method === 'DELETE') {
    await store.delete(SNAPSHOT_KEY);
    return new Response(null, { status: 204 });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = { path: '/api/sync', method: ['GET', 'PUT', 'DELETE'] };
