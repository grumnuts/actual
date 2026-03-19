###################################################
# Multi-architecture Docker image for Actual Budget
# Supports: linux/amd64, linux/arm64
###################################################

FROM node:22-bookworm AS deps

# Install required packages
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the files needed for installing dependencies
COPY .yarn ./.yarn
COPY yarn.lock package.json .yarnrc.yml tsconfig.json ./
COPY packages/api/package.json packages/api/package.json
COPY packages/component-library/package.json packages/component-library/package.json
COPY packages/crdt/package.json packages/crdt/package.json
COPY packages/desktop-client/package.json packages/desktop-client/package.json
COPY packages/desktop-electron/package.json packages/desktop-electron/package.json
COPY packages/eslint-plugin-actual/package.json packages/eslint-plugin-actual/package.json
COPY packages/loot-core/package.json packages/loot-core/package.json
COPY packages/sync-server/package.json packages/sync-server/package.json
COPY packages/plugins-service/package.json packages/plugins-service/package.json

COPY ./bin/package-browser ./bin/package-browser

RUN corepack enable && yarn install

FROM deps AS builder

WORKDIR /app

COPY packages/ ./packages/
COPY bin/ ./bin/

# Increase memory limit for the build process
ENV NODE_OPTIONS=--max_old_space_size=8192

RUN yarn build:browser

FROM node:22-bookworm-slim AS prod

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl && apt-get clean -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the built browser assets
COPY --from=builder /app/packages/desktop-client/build ./packages/desktop-client/build
COPY --from=builder /app/packages/plugins-service/dist ./packages/plugins-service/dist
COPY --from=builder /app/node_modules ./node_modules

# Copy Yarn release binary (required by .yarnrc.yml)
COPY --from=builder /app/.yarn ./.yarn

# Copy source files needed for runtime
COPY package.json yarn.lock .yarnrc.yml tsconfig.json ./
COPY packages/desktop-client/package.json ./packages/desktop-client/
COPY packages/plugins-service/package.json ./packages/plugins-service/
COPY bin/ ./bin/

# Create a simple startup script for the web interface
ENV PORT=3001
EXPOSE $PORT

CMD ["sh", "-c", "cd /app && yarn workspace @actual-app/web start:browser --host"]
