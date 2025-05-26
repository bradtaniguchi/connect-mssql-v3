import MSSQLStore from "connect-mssql-v3";
import express, { Request, Response } from "express";
import session from "express-session";

// Extend the express-session SessionData interface to include 'views'
declare module "express-session" {
  interface SessionData {
    views?: number;
  }
}

const app = express();

const config = {
  user: "your_db_user",
  password: "your_db_password",
  server: "localhost", // You can use 'localhost\\instance' to connect to named instance
  database: "your_database_name",
  options: {
    encrypt: true, // Use this if you're on Windows Azure
    trustServerCertificate: true, // use this if your MS SQL instance uses a self signed certificate
  },
};

const storeOptions = {
  ttl: 1000 * 60 * 60 * 2, // Session TTL set to 2 hours
  // autoRemove: true, // Option to automatically remove expired sessions
  // autoRemoveInterval: 1000 * 60 * 15 // Interval for auto-removal (15 minutes)
};

app.use(
  session({
    store: new MSSQLStore(config, storeOptions),
    secret: "a_very_secret_key_for_signing_session_id_cookie",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // secure: true, // Uncomment this in production if using HTTPS
      // httpOnly: true, // Helps prevent XSS attacks
      // maxAge: 1000 * 60 * 60 * 2 // Cookie maxAge should ideally match session ttl
    },
  })
);

app.get("/", (req: Request, res: Response) => {
  if (req.session.views) {
    req.session.views++;
    res.setHeader("Content-Type", "text/html");
    res.write("<p>views: " + req.session.views + "</p>");
    res.write("<p>session ID: " + req.sessionID + "</p>");
    res.write(
      "<p>expires in: " +
        (req.session.cookie.maxAge
          ? req.session.cookie.maxAge / 1000 + "s"
          : "session cookie") +
        "</p>"
    );
    res.end();
  } else {
    req.session.views = 1;
    res.end("Welcome to the session demo. Refresh the page!");
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
  console.log("Ensure you have created the sessions table in your database:");
  console.log(`
    CREATE TABLE [dbo].[sessions](
      [sid] [nvarchar](255) NOT NULL PRIMARY KEY,
      [session] [nvarchar](max) NOT NULL,
      [expires] [datetime] NOT NULL
    )
  `);
});
