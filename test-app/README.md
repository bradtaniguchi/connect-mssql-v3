# test-app

This app is a bare-bones express app designed to help test this library.

Its written as minimally as possible to focus around the usage of express+expression-sessions and connect-mssql-v3.

It utilizes a docker-based configuration so technically anyone with docker can run, and thus debug the library.

## To run

<!-- TODO: review with docker support -->

- first be sure to build the library for consumption to test/validate against via
- then we move into the `test-app` repo and run it like your average express app.

```bash
# in root of repo
npm run build
cd test-app
npm run build
npm run start
```
