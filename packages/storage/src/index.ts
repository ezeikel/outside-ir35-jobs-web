/**
 * @outside-ir35-jobs/storage
 *
 * Shared Cloudflare R2 storage module. Drop-in replacement for @vercel/blob
 * with the same put / del / list / exists API. Used for contractor documents
 * (CVs, certificates of incorporation, insurance certs, etc.) and any other
 * uploaded assets.
 */

export type { ListOptions, ListResult, PutOptions, PutResult } from './r2';
export { del, exists, getSignedDownloadUrl, list, put } from './r2';
