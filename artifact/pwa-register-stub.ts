// The artifact build has no service worker, so registering one is a no-op.
export function registerSW(_opts?: unknown) {
  return async () => {};
}
