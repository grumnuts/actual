###################################################
# This Dockerfile is used by the docker-compose.yml
# file to build the development container.
# Do not make any changes here unless you know what
# you are doing.
###################################################

FROM node:22-bookworm AS dev
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN corepack enable && yarn install --immutable
CMD ["sh", "./bin/docker-start"]
