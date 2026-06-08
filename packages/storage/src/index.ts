/**
 * @outside-ir35/storage
 *
 * Shared Cloudflare R2 storage module. Drop-in replacement for @vercel/blob
 * with the same put / del / list / exists API. Used for contractor documents
 * (CVs, certificates of incorporation, insurance certs, etc.) and any other
 * uploaded assets.
 */

export { put, del, list, exists } from './r2';
export type { PutOptions, PutResult, ListOptions, ListResult } from './r2';
