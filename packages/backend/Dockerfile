FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest-10 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN pnpm install --frozen-lockfile --filter @todo-app/backend...

COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@latest-10 --activate

WORKDIR /app

COPY --from=build /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/tsconfig.base.json ./
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/packages/shared/ packages/shared/
COPY --from=build /app/packages/backend/ packages/backend/

EXPOSE 3000

CMD ["pnpm", "--filter", "@todo-app/backend", "dev"]
