import { SchemaResponse, getForeignKeys, getItem, getList, getSchema, getTriggers, patchItem, postItem, removeItem } from "api";
import { useSource } from "hooks/useSource";
import { Dispatch, PropsWithChildren, SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RegistryPaginationContext, RegistryPaginationSettingsContext, usePagination } from "./pagination";
import { ConfigurationContext } from "App";
import { GridInputRowSelectionModel, GridRowSelectionModel, GridSortModel } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";

export interface RegistryProps { tableName: string, id?: string, action?: string };

export const RegistryPropsContext = createContext<RegistryProps>({ tableName: "" });

export interface RegistryDataContextBody<T> {
  data?: T[];
  item?: T;
  pages?: number;
  save: (item: T) => Promise<T>;
  remove: () => Promise<any>;
}

export interface FilterBody { name: string, data: any };
export interface FilterValue { name: string, value: string | null };

export interface RegistryFiltersContextBody {
  filters: FilterBody[];
  values: FilterValue[];
  onChange: Dispatch<SetStateAction<FilterValue[]>>;
}

export interface RegistrySelectionBody {
  selectionModel: GridRowSelectionModel,
  onRowSelectionModelChange: Dispatch<SetStateAction<GridRowSelectionModel>>
}

export interface RegistrySortContextBody {
  sortModel: GridSortModel,
  onSortModelChange: Dispatch<SetStateAction<GridSortModel>>
};

export interface RegistryCurrentContextBody<T> {
  current: T,
  setCurrent: Dispatch<SetStateAction<T>>
}; 

export interface RegistrySchemaBody {
  complexForeignKeys: {
    literals?: string[];
    paramName?: string;
  };

  schema: SchemaResponse;

  foreignKeys: Record<string, {
    foreign_key_column: string;
    foreign_key_table: string;
  }>;
}

export const RegistryDataContext = createContext<RegistryDataContextBody<any>>({ save: () => Promise.resolve(void 0), remove: () => Promise.resolve(void 0) });

export const RegistryFiltersContext = createContext<RegistryFiltersContextBody>({ filters: [], values: [], onChange: () => void 0 });

export const RegistrySelectionContext = createContext<RegistrySelectionBody>({ selectionModel: [], onRowSelectionModelChange: () => void 0 });

export const RegistrySortContext = createContext<RegistrySortContextBody>({ sortModel: [], onSortModelChange: () => void 0 });

export const SchemaContext = createContext<RegistrySchemaBody>({ foreignKeys: {}, schema: { properties: {}, type: "object", required: [] }, complexForeignKeys: {} });

export const CurrentContext = createContext<RegistryCurrentContextBody<any>>({ current: void 0, setCurrent: () => void 0 });

export const RegistryProvider = <T, >({ children, tableName, id, action }: PropsWithChildren<RegistryProps>) => {
  const navigate = useNavigate();

  const config = useContext(ConfigurationContext);
  const variants = useMemo(() => config.tables.find(i => i.name === tableName)!.list.pageSizeList, [config, tableName]);
  const paginationSettingsContext = useMemo(() => ({ count: variants[0], variants }), [variants]);
  const paginationContext = usePagination(paginationSettingsContext);

  const filterConfig = useMemo(() => config.tables.find(i => i.name === tableName)!.list.filters, [tableName]);
  const filterBodies = useMemo(() => Object.keys(filterConfig).map(name => ({ name, data: (filterConfig as any)[name] })), [filterConfig]);
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const registryFiltersContext = useMemo(() => ({ filters: filterBodies, values: filterValues, onChange: setFilterValues }), [filterBodies, filterValues]);

  const [sortModel, onSortModelChange] = useState<GridSortModel>([]);
  const registrySortContext = useMemo(() => ({ sortModel, onSortModelChange }), [sortModel, onSortModelChange]);

  const [selectionModel, onRowSelectionModelChange] = useState<GridRowSelectionModel>([]);
  const registrySelectionContext = useMemo(() => ({ selectionModel, onRowSelectionModelChange }), [selectionModel, onRowSelectionModelChange]);

  const [filter, setFilter] = useState('');

  useEffect(() => {
    const interv = setInterval(() => {
      setFilter(filterValues.map(i => {
        const operator = (filterConfig as any)[i.name].operator;
        
        return operator === 'contains' ? `contains(${i.name}, '${i.value}')` : `${i.name} ${operator} '${i.value}'`;
      }).join(' and '))
    }, 500);

    return () => {
      clearInterval(interv);
    }
  }, [filterValues, filterConfig, tableName]);

  const { data: itemsData, fetch: fetchList } = useSource(() => getList({
    name: tableName,
    pagination: { skip: ((paginationContext.page - 1) * paginationContext.limit), top: paginationContext.limit },
    order: sortModel,
    filter: filter ?? '',
  }), [paginationContext, tableName, filter, sortModel]);

  const { data: foreignKeys } = useSource(() => getForeignKeys({ name: tableName }), [paginationContext, tableName, filter, sortModel]);
  const { data: schema } = useSource(() => getSchema({ name: tableName }), [paginationContext, tableName, filter, sortModel]);
  const { data: complexForeignKeys } = useSource(() => getTriggers({ name: tableName }), [paginationContext, tableName, filter, sortModel]);

  const { data: item } = useSource(() => !id ? Promise.resolve(action === 'create' ? {} : null) : getItem({ name: tableName, id }), [id, action, tableName]);

  const [current, setCurrent] = useState<T>();

  useEffect(() => {
    setCurrent(item as T);
  }, [item]);

  const remove = useCallback(() => {
    return Promise.all(selectionModel.map(i => removeItem({ name: tableName, id: i }))).then(fetchList);
  }, [selectionModel, tableName, fetchList]);

  const save = useCallback((item: T) => {
    const promise = !id ? postItem<T>({ name: tableName, item }) : patchItem<T>({ name: tableName, id, item });

    return promise.then(item => {
      // @ts-ignore // TODO: check types
      navigate(`/registry/${tableName}/item/${item.id}`);
      return item;
    }).catch(e =>{
      console.error(e);
      void 0})
  }, [tableName, id]);

  const dataContext = useMemo(() => ({
    item,
    save,
    remove,
    data: itemsData?.data,
    pages: itemsData?.count && Math.ceil(itemsData.count / paginationContext.limit),
  }), [itemsData, item, save, remove]);

  useEffect(() => {
    paginationContext.setPage(1);
    onRowSelectionModelChange([]);
    setFilter('');
  }, [tableName]);

  const propsContext = useMemo(() => ({ tableName, id }), [tableName, id]);

  const schemaContext = useMemo(() => ({ foreignKeys: foreignKeys ?? {}, schema: schema ?? { properties: {}, required: [], type: "object" }, complexForeignKeys: complexForeignKeys ?? {} }), [foreignKeys, schema, complexForeignKeys]);

  const currentContext = useMemo(() => ({ current, setCurrent }), [current, setCurrent]);

  return (
    <RegistryPaginationSettingsContext.Provider value={paginationSettingsContext}>
      <RegistryPropsContext.Provider value={propsContext}>
        <SchemaContext.Provider value={schemaContext}>
          <RegistryDataContext.Provider value={dataContext}>
            <CurrentContext.Provider value={currentContext}>
              <RegistryFiltersContext.Provider value={registryFiltersContext}>
                <RegistryPaginationContext.Provider value={paginationContext}>
                  <RegistrySortContext.Provider value={registrySortContext}>
                    <RegistrySelectionContext.Provider value={registrySelectionContext}>
                      {children}
                    </RegistrySelectionContext.Provider>
                  </RegistrySortContext.Provider>
                </RegistryPaginationContext.Provider>
              </RegistryFiltersContext.Provider>
            </CurrentContext.Provider>
          </RegistryDataContext.Provider>
        </SchemaContext.Provider>
      </RegistryPropsContext.Provider>
    </RegistryPaginationSettingsContext.Provider>
  )
}
