export type PutInput = { key: string; body: Buffer; contentType: string };
export type PutResult = { key: string; url: string };

/**
 * Where uploaded files live. Local disk in dev (LocalStorage); an S3/R2
 * implementation plugs in here later without touching the callers.
 * TODO(storage): S3Storage / R2Storage implementing this interface.
 */
export interface Storage {
  put(input: PutInput): Promise<PutResult>;
  delete(key: string): Promise<void>;
  /** URL stored in the database and used by <Image src>. */
  publicUrl(key: string): string;
}
