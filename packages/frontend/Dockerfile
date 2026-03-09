FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest-10 --activate

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/

RUN pnpm install --frozen-lockfile --filter @todo-app/frontend...

COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/

RUN pnpm --filter @todo-app/frontend build

FROM nginx:alpine

COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80
