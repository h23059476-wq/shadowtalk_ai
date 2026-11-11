/**
 * Cloud Storage → Supabase-storage-style surface.
 * Logical "buckets" map to a top-level folder: `<bucket>/<path>`.
 */
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import { fbStorage } from './app';

function bucketRef(bucket: string, path = '') {
  return storageRef(fbStorage(), path ? `${bucket}/${path}` : bucket);
}

function bucketApi(bucket: string) {
  return {
    async upload(path: string, file: Blob | File | ArrayBuffer | Uint8Array, opts?: any) {
      try {
        const data =
          file instanceof Blob ? file : new Blob([file as any], { type: opts?.contentType });
        const res = await uploadBytes(bucketRef(bucket, path), data, {
          contentType: opts?.contentType || (file as File)?.type,
        });
        return { data: { path, id: res.ref.fullPath, fullPath: res.ref.fullPath }, error: null };
      } catch (error: any) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },

    async download(path: string) {
      try {
        const url = await getDownloadURL(bucketRef(bucket, path));
        const res = await fetch(url);
        return { data: await res.blob(), error: null };
      } catch (error: any) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },

    async createSignedUrl(path: string, _expiresIn?: number) {
      try {
        const signedUrl = await getDownloadURL(bucketRef(bucket, path));
        return { data: { signedUrl }, error: null };
      } catch (error: any) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },

    getPublicUrl(path: string) {
      const encoded = encodeURIComponent(`${bucket}/${path}`);
      const b = (fbStorage() as any).app?.options?.storageBucket;
      return {
        data: {
          publicUrl: `https://firebasestorage.googleapis.com/v0/b/${b}/o/${encoded}?alt=media`,
        },
      };
    },

    async remove(paths: string[] | string) {
      const list = Array.isArray(paths) ? paths : [paths];
      try {
        await Promise.all(list.map((p) => deleteObject(bucketRef(bucket, p))));
        return { data: list.map((p) => ({ name: p })), error: null };
      } catch (error: any) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },

    async list(prefix = '') {
      try {
        const res = await listAll(bucketRef(bucket, prefix));
        return {
          data: [
            ...res.items.map((i) => ({ name: i.name, id: i.fullPath })),
            ...res.prefixes.map((p) => ({ name: p.name, id: p.fullPath })),
          ],
          error: null,
        };
      } catch (error: any) {
        return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },
  };
}

export function createStorageAdapter() {
  return {
    from: (bucket: string) => bucketApi(bucket),
    // Buckets are logical folders in Firebase — these are no-ops that succeed.
    listBuckets: async () => ({ data: [], error: null }),
    getBucket: async () => ({ data: null, error: null }),
    createBucket: async () => ({ data: null, error: null }),
    emptyBucket: async () => ({ data: null, error: null }),
    deleteBucket: async () => ({ data: null, error: null }),
  };
}
