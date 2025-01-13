FROM node:22.7.0-alpine3.20
WORKDIR /app

# Install git
RUN apk add --no-cache git

# Configure git
RUN git config --global user.email "ai@srcbook.com" && \
    git config --global user.name "Srcbook"

RUN corepack enable && corepack prepare pnpm@9.12.1 --activate

# Copy all package files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages/
COPY srcbook srcbook/
COPY turbo.json ./
COPY srcbook_mcp_config.json ./

# Add a build arg for container detection
ENV CONTAINER=true

# Keep the --no-optional flag since we're explicitly handling platform selection
RUN pnpm install --no-optional

# Build with our platform detection in place
RUN pnpm build

# Create necessary directories for volumes
RUN mkdir -p /root/.srcbook /root/.npm

# Create directories for filesystem server
RUN mkdir -p /app/data/Desktop /app/data/Downloads

# Set container environment variable
ENV CONTAINER=true

# Source code will be mounted at runtime
CMD [ "pnpm", "start" ]

EXPOSE 2150