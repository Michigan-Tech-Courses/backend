FROM node:20-slim AS builder

ENV NODE_ENV production
ENV APP_HOME=/opt/node/app

USER node:node
WORKDIR $APP_HOME

COPY --chown=node:node package.json ./
COPY --chown=node:node yarn.lock ./

RUN yarn install --frozen-lockfile --production=false

COPY --chown=node:node . .

RUN yarn build

FROM node:20-slim

# Required by Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV production
ENV APP_HOME=/opt/node/app

USER node:node
WORKDIR $APP_HOME

COPY --chown=node:node package.json ./
COPY --chown=node:node yarn.lock ./
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

COPY --chown=node:node prisma ./prisma
COPY --from=builder --chown=node:node $APP_HOME/dist ./dist

CMD ["yarn", "start"]
