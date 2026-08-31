# Local-development image only. Production continues to use the release deployment workflow.
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable
WORKDIR /workspace

COPY . .
RUN pnpm install --frozen-lockfile

