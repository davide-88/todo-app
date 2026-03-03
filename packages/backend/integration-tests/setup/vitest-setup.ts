import { afterAll } from "vitest";
import { teardownSetup } from "./setup.js";

afterAll(async () => {
  await teardownSetup();
});
