import { createContext, useCallback, useEffect, useMemo, useState } from "react";

export interface RegistryPaginationContextBody {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export type RegistryPaginationInputContextBody = Pick<RegistryPaginationContextBody, 'page' | 'limit'>;

export interface RegistryPaginationContextBody {
  page: number;
  limit: number;
}

const DEFAULT_REGISTRY_PAGINATION_CONTEXT: RegistryPaginationInputContextBody = {
  page: 1,
  limit: 10,
}

export const RegistryPaginationContext = createContext<RegistryPaginationContextBody>({
  ...DEFAULT_REGISTRY_PAGINATION_CONTEXT,
  setLimit: () => void 0,
  setPage: () => void 0
});

export type RegsitryPaginationSettingsContextBody = { count: number, variants: number[] };

export const RegistryPaginationSettingsContext = createContext<RegsitryPaginationSettingsContextBody>({ count: 10, variants: [] })

export const usePagination = ({ count, variants }: RegsitryPaginationSettingsContextBody): RegistryPaginationContextBody => {
  const [paginationContext, setPaginationContext] = useState<RegistryPaginationInputContextBody>({ ...DEFAULT_REGISTRY_PAGINATION_CONTEXT, limit: count });

  useEffect(() => {
    setPaginationContext(old => ({ page: 1, limit: count }))
  }, [count]);

  const setPage = useCallback((page: number) => {
    setPaginationContext(old => ({ ...old, page }))
  }, []);

  const setLimit = useCallback((limit: number) => {
    setPaginationContext(old => ({ ...old, limit, page: 1 }))
  }, []);

  const context = useMemo(() => ({
    ...paginationContext,

    setLimit,
    setPage
  }), [paginationContext]);

  return context;
}
