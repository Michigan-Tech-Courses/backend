# @mtucourses/backend

[![codecov](https://codecov.io/gh/Michigan-Tech-Courses/backend/branch/main/graph/badge.svg?token=4QFVTDJ50K)](https://codecov.io/gh/Michigan-Tech-Courses/backend)

## 🧰 Development

Copy `.env.example` to `.env` and update as necessary. Then:

```bash
# First:
# install dependencies
yarn install

# then:
# start dev server in watch mode
yarn dev

# or run a lighter version (don't actively scrape)
yarn dev:no-processors

# and you can:

# run tests
yarn test

# run tests in watch mode
yarn test:watch

# run e2e tests
yarn test:e2e

# generate migrations for schema changes
yarn migrations:generate

# apply migrations
yarn migrations:run
```
