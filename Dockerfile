FROM node:18

ENV NODE_ENV production
ENV APP_HOME=/opt/node/app

USER node:node
WORKDIR $APP_HOME

COPY --chown=node:node package.json ./
COPY --chown=node:node yarn.lock ./

RUN yarn install --frozen-lockfile --production=false

COPY --chown=node:node . .

RUN yarn build

CMD ["yarn", "start"]
