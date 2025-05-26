export interface MSSQLStoreOptions {
  /**
   * Table to use as session store. Default: `[sessions]`
   */
  table: string;
  /**
   * (Time To Live) Determines the expiration date. Default: `1000 * 60 * 60 * 24` (24 hours)
   */
  ttl: number;
  /**
   * Determines if expired sessions should be auto-removed or not.
   * If value is `true` then a new function, `destroyExpired()`,
   * will auto-delete expired sessions on a set interval. Default: `false`
   */
  autoRemove: boolean;
  /**
   * Sets the timer interval for each call to `destroyExpired()`.
   * Default: `1000 * 60 * 10` (10 min)
   */
  autoRemoveInterval: number;
  /**
   * Callback function that is called before a session is removed.
   * Can return a promise that will be awaited before continuing.
   */
  preRemoveCallback: () => Promise<unknown>;
  /**
   * Is the callback function for `destroyExpired()`. Default: `undefined`
   */
  autoRemoveCallback: (props: unknown) => unknown;
  /**
   * Determines if we are to use the `GETUTCDATE` instead of `GETDATE` Default: `true`
   */
  useUTC: boolean;
  /**
   * The number of times to retry a DB connection before failing. Default: 0
   */
  retries: number;
  /**
   * The initial connection retry delay in milliseconds. Default: 1000
   */
  retryDelay: number;
}
