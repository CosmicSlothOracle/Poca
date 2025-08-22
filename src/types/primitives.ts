export type UID = string & { readonly __brand: 'UID' };

export const asUID = (x: string): UID => x as UID;
