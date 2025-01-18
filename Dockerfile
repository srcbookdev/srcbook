FROM node:20-bullseye-slim
WORKDIR /app

# Install git
RUN apt-get update && apt-get install -y git

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

# Install dependencies
RUN pnpm install

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