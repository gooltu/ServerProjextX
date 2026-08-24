FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN chown -R node:node /usr/src/app
USER node

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "./bin/www"]
