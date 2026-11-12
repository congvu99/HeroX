# syntax=docker/dockerfile:1
# Image HeroX. Target mặc định `runtime` là image chạy production (chỉ dist + dependency production).
# Các target `e2e-seed`, `web-e2e` chỉ dùng cho compose.dev.yml (môi trường thử E2E).

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.29-alpine

# ---- build: cài đủ dependency, build shared → server → client ----
FROM ${NODE_IMAGE} AS build
# pixelfx (devDependency) cài từ git.
RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
COPY assets assets
RUN npm run build

# ---- prod-deps: chỉ dependency production của server (shared là workspace, nối symlink) ----
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace @herox/server --include-workspace-root=false --ignore-scripts

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3180
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node shared/package.json shared/
COPY --chown=node:node server/package.json server/
COPY --from=build --chown=node:node /app/shared/dist shared/dist
COPY --from=build --chown=node:node /app/server/dist server/dist
# Bản build client đi kèm để server phục vụ /herox/ khi có route file tĩnh; hiện server chỉ phục vụ API.
COPY --from=build --chown=node:node /app/client/dist client/dist
USER node
EXPOSE 3180
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3180)+'/herox/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server/dist/server.js"]

# ---- e2e-seed: seed DB thử của compose.dev.yml (cần mã nguồn TS + tsx) ----
FROM build AS e2e-seed
COPY e2e e2e
CMD ["npx", "tsx", "--conditions=source", "e2e/support/seed-e2e-database-cli.ts"]

# ---- web-e2e: nginx phục vụ client bản dev (giữ hook kiểm thử) và proxy API như proxy production ----
FROM build AS client-e2e-build
RUN NODE_ENV=development npm run build -w @herox/client -- --outDir dist-e2e

FROM ${NGINX_IMAGE} AS web-e2e
COPY deploy/nginx-e2e.conf /etc/nginx/conf.d/default.conf
COPY --from=client-e2e-build /app/client/dist-e2e /usr/share/nginx/html/herox
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/herox/"]

# Target mặc định khi build không chỉ định --target.
FROM runtime
