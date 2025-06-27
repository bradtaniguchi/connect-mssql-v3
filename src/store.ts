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

  /**
   * Calculate the expiration date for a session based on the cookie configuration
   * and the store's TTL setting.
   */
  private getExpirationDate(sessionCookie: { expires?: Date | null }): Date {
    const ttl = this.options.ttl || 1000 * 60 * 60 * 24; // 24 hours default

    // If expires is explicitly set to a Date, use it; otherwise use TTL
    if (sessionCookie.expires instanceof Date) {
      return sessionCookie.expires;
    }

    return new Date(Date.now() + ttl);
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
    // Attach event listeners
    this.databaseConnection.on("connect", () => this.emit("connect", this));
    this.databaseConnection.on("error", (error) => this.emit("error", error));

    // Connect to the database
    await this.databaseConnection.connect();
    this.databaseConnection.emit("connect");

    // Set up auto-removal if enabled
    if (this.options.autoRemove) {
      const interval = this.options.autoRemoveInterval || 1000 * 60 * 10; // 10 minutes default
      setInterval(() => this.destroyExpired(), interval);
    }
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
  public async get(sid: string): Promise<SessionData | null>;
  public async get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void
  ): Promise<void>;
  public async get(
    sid: string,
    callback?: (err: unknown, session?: SessionData | null) => void
  ): Promise<SessionData | null | void> {
    try {
      const results = await this.queryRunner<{ session: SessionData }>({
        queryStatement: `SELECT session FROM ${this.options.table} WHERE sid = @sid`,
        expectReturn: true,
        inputParameters: { sid },
      });

      const session = results && results.length > 0 ? results[0].session : null;

      if (callback) {
        callback(null, session);
        return;
      }

      return session;
    } catch (err) {
      this.errorHandler("get", err);

      if (callback) {
        callback(err);
        return;
      }

      throw err;
    }
  }
  public async set(
    sid: string,
    session: SessionData,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      const expires = this.getExpirationDate(session.cookie);

      await this.queryRunner({
        inputParameters: {
          sid,
          session: JSON.stringify(session),
          expires,
        },
        queryStatement: `UPDATE ${this.options.table}
                           SET session = @session, expires = @expires
                           WHERE sid = @sid;
                           IF @@ROWCOUNT = 0
                            BEGIN
                              INSERT INTO ${this.options.table} (sid, session, expires)
                                VALUES (@sid, @session, @expires)
                            END;`,
        expectReturn: false,
      });

      if (typeof callback === "function") {
        callback();
      }
    } catch (err) {
      this.errorHandler("set", err);

      if (typeof callback === "function") {
        callback(err);
        return;
      }

      throw err;
    }
  }
  public async destroy(
    sid: string,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      await this.queryRunner({
        inputParameters: { sid },
        queryStatement: `DELETE FROM ${this.options.table} WHERE sid = @sid`,
        expectReturn: false,
      });

      if (callback) {
        callback();
      }
    } catch (err) {
      this.errorHandler("destroy", err);

      if (callback) {
        callback(err);
        return;
      }

      throw err;
    }
  }
  /**
   * Destroy expired sessions from the store.
   */
  public async destroyExpired(
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      if (this.options.preRemoveCallback) {
        const preRemoveResult = this.options.preRemoveCallback();
        if (preRemoveResult instanceof Promise) {
          await preRemoveResult;
        }
      }

      const useUTC = this.options.useUTC !== false; // default to true
      const dateFunction = useUTC ? "GETUTCDATE" : "GETDATE";

      await this.queryRunner({
        queryStatement: `DELETE FROM ${this.options.table} WHERE expires <= ${dateFunction}()`,
        expectReturn: false,
      });

      if (this.options.autoRemoveCallback) {
        this.options.autoRemoveCallback(null);
      }

      if (callback) {
        callback();
      }
    } catch (err) {
      this.errorHandler("destroyExpired", err);

      if (this.options.autoRemoveCallback) {
        this.options.autoRemoveCallback(err);
      }

      if (callback) {
        callback(err);
        return;
      }

      throw err;
    }
  }
}

export default MSSQLStore;
