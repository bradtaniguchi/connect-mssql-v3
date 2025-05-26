import { config, ConnectionPool } from "mssql";

const sqlConfig: config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER ?? "",
  database: process.env.SQL_DATABASE,
  options: { trustServerCertificate: true },
};

beforeAll(async () => {
  const db = new ConnectionPool(sqlConfig);
  await db.connect();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const request = db.request();

  // TODO: do some sanity testing before hand
  // await request.query("DELETE FROM dbo.Sessions");
  // await db.close();
});

describe("connect-mssql-v3", () => {
  // TODO: write some tests
});
