# syntax=docker/dockerfile:1

# --- build ------------------------------------------------------------------
# The atlas is a static Vite build, so the image only needs the toolchain at
# build time. The runtime stage ships the compiled files and nothing else.
FROM node:22-alpine AS build

WORKDIR /app

# Copy the workspace manifests first so the dependency layer is reused whenever
# only application source changes.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/data/package.json packages/data/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/simulation/package.json packages/simulation/package.json

RUN npm ci

COPY . .

# tsc -b then vite build. The content audit and unit tests are not needed to
# produce the bundle; `npm run check` remains the quality gate for those.
RUN npm run build

# --- serve ------------------------------------------------------------------
FROM nginx:1.29-alpine AS serve

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Same port in and out, so the container, the host, and local dev agree.
EXPOSE 6055

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:6055/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
