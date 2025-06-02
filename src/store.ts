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

  public constructor(config: SQLConfig, options?: Partial<MSSQLStoreOptions>) {
    super();
    this.options = options || MSSQL_DEFAULT_STORE_OPTIONS;
    this.config = config;
    this.databaseConnection = new ConnectionPool(config);
  }

  // **note** no comments here to allow for the parent class to handle the comments
  public async get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void
  ) {
    throw new Error("Method not implemented.");
  }
  // **note** no comments here to allow for the parent class to handle the comments
  public async set(
    sid: string,
    session: SessionData,
    callback?: (err?: unknown) => void
  ) {
    throw new Error("Method not implemented.");
  }
  // **note** no comments here to allow for the parent class to handle the comments
  public async destroy(sid: string, callback?: (err?: unknown) => void) {
    throw new Error("Method not implemented.");
  }

  /**
   * Generic error handled method that is called anytime an error is caught
   *
   * @param method the method that caused the error
   * @param error the error that occurred
   */
  private errorHandler(method: keyof MSSQLStore, error: unknown) {
    this.databaseConnection.once("sessionError", () =>
      this.emit("sessionError", error, method)
    );
    this.databaseConnection.emit("sessionError", error, method);
  }

  private async initializeDatabase() {
    throw new Error("initializeDatabase method not implemented");
  }

  /**
   * Verifies database connection has been established.
   *
   * If not then it will initialize the database connection.
   */
  private async dbReadyCheck() {
    const retries = this.options.retries || 0;
    const retryDelay = this.options.retryDelay || 1000;

    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        if (
          !this.databaseConnection.connected &&
          !this.databaseConnection.connecting
        ) {
          await this.initializeDatabase();
        }

        if (this.databaseConnection?.connected) {
          return true;
        }

        throw new Error("Connection is closed.");
      } catch (error) {
        if (attempt < retries) {
          // increasing delay
          await new Promise((resolve) => {
            setTimeout(resolve, retryDelay * attempt);
          });
        } else {
          this.databaseConnection.emit("error", error);
          throw error;
        }
      }
    }
    return false;
  }

  /**
   *
   * @param props
   */
  private async queryRunner<T>(props: {
    inputParameters?: Record<string, unknown>;
    expectReturn: boolean;
    queryStatement: string;
  }) {
    const { inputParameters, expectReturn, queryStatement } = props;
    const isReady = await this.dbReadyCheck();
    if (!isReady) {
      throw new Error("Database connection is closed");
    }
    const request = this.databaseConnection.request();
    for (const [key, value] of Object.entries(inputParameters || {})) {
      request.input(key, value);
    }

    const result = await request.query<T>(queryStatement);
    if (expectReturn) {
      return result.recordset;
    }
    return null;
  }
  /**
   * Attempt to fetch all sessions.
   */
  public async all(): Promise<Record<string, SessionData>> {
    try {
      // TODO: this will need to change for custom data sets
      const results = await this.queryRunner<{
        sid: string;
        session: SessionData;
      }>({
        queryStatement: `SELECT sid, session FROM ${this.options.table}`,
        expectReturn: true,
      });

      if (!results || results.length === 0) {
        return {};
      }

      return results.reduce((acc, { sid, session }) => {
        acc[sid] = session;
        return acc;
      }, {} as Record<string, SessionData>);
    } catch (err) {
      this.errorHandler("all", err);

      throw err;
    }
  }
}

export default MSSQLStore;
