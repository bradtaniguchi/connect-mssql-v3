import { MSSQLStoreOptions } from "./store-options";

/**
 * Default options for the MSSQL session store.
 *
 * These are provided if no options are provided at all when
 * creating a new instance of the MSSQLStore.
 *
 * Otherwise this can be utilized as a starter default store option
 */
export const MSSQL_DEFAULT_STORE_OPTIONS: Partial<MSSQLStoreOptions> = {
  table: "sessions",
  ttl: 1000 * 60 * 60 * 24, // 24 hours
  autoRemove: true,
  autoRemoveInterval: 1000 * 60 * 10,
  useUTC: true,
  retries: 0,
};
