import { createApp } from "./app.mjs";

if (
  process.env.NODE_ENV === "production" &&
  process.env.DEMO_ACCESS !== "true"
) {
  console.error(
    "This prototype uses prepared demo identities. Set DEMO_ACCESS=true explicitly to deploy a demonstration. Managed resident identity is not implemented.",
  );
  process.exit(1);
}
const { app, close } = createApp();
const port = Number(process.env.PORT || 3001);
const bindHost =
  process.env.RUANGKITA_HOST ||
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const server = app.listen(port, bindHost, () =>
  console.log(
    `RUANGKITA demo API listening on ${bindHost}:${port}; SQLite persistence enabled. Prepared identities are for demonstration only.`,
  ),
);
const shutdown = () =>
  server.close(() => {
    close();
    process.exit(0);
  });
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
