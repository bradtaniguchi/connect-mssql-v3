/* eslint-disable @typescript-eslint/no-unused-vars */
import { Store as ExpressSessionStore, SessionData } from "express-session";
import { ConnectionPool, config as SQLConfig } from "mssql";
import { MSSQL_DEFAULT_STORE_OPTIONS } from "./default-options";
import { MSSQLStoreOptions } from "./store-options";

export class MSSQLStore extends ExpressSessionStore {
  /**
   * The options for the MSSQL store.
   */
  public options: Partial<MSSQLStoreOptions>;
  /**
   * The underlying configuration for the MSSQL store.
   *
   * This is passed directly into the ConnectionPool constructor from
   * the MSSQL library.
   */
  public config: SQLConfig;
  /**
   * The connection pool used to connect to the MSSQL database.
   */
  public databaseConnection: ConnectionPool;
  constructor(config: SQLConfig, options?: Partial<MSSQLStoreOptions>) {
    super();
    this.options = options || MSSQL_DEFAULT_STORE_OPTIONS;
    this.config = config;
    this.databaseConnection = new ConnectionPool(config);
  }

  // **note** no comments here to allow for the parent class to handle the comments
  async get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void
  ) {
    throw new Error("Method not implemented.");
  }
  // **note** no comments here to allow for the parent class to handle the comments
  async set(
    sid: string,
    session: SessionData,
    callback?: (err?: unknown) => void
  ) {
    throw new Error("Method not implemented.");
  }
  // **note** no comments here to allow for the parent class to handle the comments
  async destroy(sid: string, callback?: (err?: unknown) => void) {
    throw new Error("Method not implemented.");
  }
}

export default MSSQLStore;
