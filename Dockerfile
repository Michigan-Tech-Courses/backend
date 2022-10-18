FROM node:16-alpine AS base

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

# Build app
COPY . .

RUN yarn prisma generate && yarn build

ENV NODE_ENV=production

ENTRYPOINT ["yarn"]

CMD ["start"]
