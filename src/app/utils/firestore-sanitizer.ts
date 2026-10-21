/**
 * Recursively sanitizes objects and data structures for Cloud Firestore.
 * - Drops `undefined` properties entirely (does NOT convert them to `null`).
 * - Preserves `Date` instances, Firestore FieldValue/Timestamp objects, booleans, numbers, strings.
 * - Recursively processes nested objects and arrays, filtering out `undefined` entries.
 */
export function sanitizeForFirestore<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj as any;
  }

  // Primitive values
  if (typeof obj !== 'object') {
    return obj;
  }

  // Preserve Date instances
  if (obj instanceof Date) {
    return obj as any;
  }

  // Preserve Firestore Timestamp & FieldValue objects (duck typing)
  if (typeof obj.toMillis === 'function' || obj.constructor?.name === 'FieldValue' || (obj as any)._methodName) {
    return obj;
  }

  // Process arrays
  if (Array.isArray(obj)) {
    return obj
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined) as any;
  }

  // Process plain objects
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      const sanitized = sanitizeForFirestore(value);
      if (sanitized !== undefined) {
        cleaned[key] = sanitized;
      }
    }
  }

  return cleaned as T;
}
