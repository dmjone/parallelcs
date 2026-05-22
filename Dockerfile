# ParallelCS — multi-stage build for Cloud Run.
# Stage 1 installs production dependencies; stage 2 is a lean, non-root runtime.

# --- deps -----------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
# Pin pnpm via corepack. The version is fixed (not "latest") so the build is
# deterministic and matches the committed lockfile's generator — newer pnpm
# majors change install behaviour (e.g. exit 1 on ignored build scripts).
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
COPY package.json pnpm-lock.yaml* ./
# Production-only install. `--ignore-scripts` skips dependency build scripts
# (protobufjs / @google/genai ship postinstall codegen the runtime does not
# need); this also avoids pnpm's hard failure on "ignored build scripts".
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# --- runtime --------------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy installed dependencies and application source.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Run as the unprivileged `node` user shipped with the base image.
USER node

EXPOSE 8080
CMD ["node", "src/server.mjs"]
