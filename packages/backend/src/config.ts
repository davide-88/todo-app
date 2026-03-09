import envSchema from "env-schema";
import { Type, type Static } from "typebox";

const schema = Type.Object({
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: "0.0.0.0" }),
  DATABASE_URL: Type.String({
    default: "postgresql://todoapp:todoapp@localhost:5432/todoapp",
  }),
  CORS_ORIGIN: Type.String({
    default: "false",
  }),
  RATE_LIMIT_MAX: Type.Number({ default: 60 }),
});

export type Env = Static<typeof schema>;

const _config = envSchema<Env>({
  schema,
  dotenv: { path: process.env["DOTENV_CONFIG_PATH"] ?? ".env" },
});

export const config = {
  ..._config,
  CORS_ORIGIN: Boolean(_config.CORS_ORIGIN),
};

console.dir(_config, { depth: null });