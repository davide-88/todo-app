import { buildApp } from "../../src/app.js";
import { config } from "../../src/config.js";

let app: Awaited<ReturnType<typeof buildApp>> | undefined;

export async function setup() {
  app = buildApp();
  await app.listen({ port: config.PORT, host: config.HOST });
}

export async function teardown() {
  await app?.close();
}
