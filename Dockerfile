FROM node:15-alpine AS base

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./
COPY prisma .

# Install prod dependencies
RUN yarn install --prod --frozen-lockfile

# Dependencies
FROM base AS dependencies

# Install dev dependencies
RUN yarn install --frozen-lockfile

# Build app
FROM dependencies AS builder

COPY . .

RUN yarn build

# Only copy essentials
FROM base AS prod

RUN yarn prisma generate

COPY --from=builder /usr/app/dist dist

ENTRYPOINT ["yarn"]

CMD ["start"]
