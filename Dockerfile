FROM node:24-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN chown -R node:node /usr/src/app
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Apply pending migrations before serving, so a deploy never runs code ahead of its schema.
# Knex's migration lock keeps concurrently booting instances from running them twice; if a
# migration fails the container exits and Docker's restart policy retries it.
CMD ["sh", "-c", "./node_modules/.bin/knex migrate:latest --knexfile knexfile_production.js --env production && exec node ./bin/www"]
