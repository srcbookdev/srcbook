FROM node:22.7.0-alpine3.20
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

# Copy all package files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages/
COPY srcbook srcbook/
COPY turbo.json ./

# Install dependencies
RUN pnpm install

# Build the application
RUN pnpm build

# Create necessary directories for volumes
RUN mkdir -p /root/.srcbook /root/.npm

# Source code will be mounted at runtime
CMD [ "pnpm", "start" ]

EXPOSE 2150