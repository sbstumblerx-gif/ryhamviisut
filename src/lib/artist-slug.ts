/** Same slug format as the artist pages (src/lib/queries.ts artistDetailQuery). */
export const artistSlug = (name: string) => name.trim().toLocaleLowerCase("fi-FI").replace(/\s+/g, "-");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
