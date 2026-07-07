// Minimal in-memory collection cache shared across screens.
//
// Problem it solves: every screen used to call listX() in its own useEffect,
// so navigating Dashboard -> Deals -> Contacts re-fetched the same tables
// over and over (see AUDITORIA-CODIGO.md §1.1). This factory gives each
// entity a single module-level store: the first mount fetches, every other
// mount reuses the cached data, and a mutation calls `invalidate()` to force
// one shared refetch that every subscribed component picks up.
//
// Intentionally hand-rolled instead of pulling in a query library: the app
// only needs list-then-filter caching with manual invalidation (no
// background refetch, no pagination, no query keys) — see Importantdoc §B3
// ("evite libs pesadas não justificadas").
import { useCallback, useSyncExternalStore } from "react";

interface CacheState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

type Listener = () => void;

export interface CollectionHookResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T[]>;
}

function createCollectionStore<T>(fetcher: () => Promise<T[]>) {
  // loading starts true: the very first subscriber always triggers a fetch
  // (see subscribe() below), so there is no real "loaded and empty" moment
  // before that fetch resolves. Starting at false let a consumer that
  // gates on `!loading` (e.g. DealDetailScreen deciding a deal doesn't
  // exist) act on an empty array before the first fetch had even started.
  let state: CacheState<T[]> = { data: [], loading: true, error: null };
  let pending: Promise<T[]> | null = null;
  let requestId = 0;
  const listeners = new Set<Listener>();

  const notify = () => listeners.forEach((listener) => listener());

  function load(force: boolean): Promise<T[]> {
    if (pending && !force) return pending;

    const thisRequestId = ++requestId;
    state = { ...state, loading: true, error: null };
    notify();

    const promise = fetcher()
      .then((data) => {
        // Discard the result if a newer request was issued meanwhile
        // (e.g. two invalidations in quick succession) so an in-flight
        // stale response can never overwrite fresher data.
        if (thisRequestId !== requestId) return data;
        state = { data, loading: false, error: null };
        notify();
        return data;
      })
      .catch((error: unknown) => {
        if (thisRequestId === requestId) {
          state = { ...state, loading: false, error: error instanceof Error ? error : new Error(String(error)) };
          pending = null;
          notify();
        }
        throw error;
      });

    pending = promise;
    return promise;
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      if (!pending) load(false);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    refresh: () => load(true),
  };
}

// Builds a `useX()` hook + a standalone `invalidateX()` for one entity.
// `useX()` re-renders every subscribed component whenever any of them
// triggers a refresh (e.g. after a create/update/delete on that entity).
export function createCollectionHook<T>(fetcher: () => Promise<T[]>) {
  const store = createCollectionStore<T>(fetcher);

  function useCollection(): CollectionHookResult<T> {
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const refresh = useCallback(() => store.refresh(), []);
    return { data: state.data, loading: state.loading, error: state.error, refresh };
  }

  return { useCollection, invalidate: () => store.refresh() };
}
