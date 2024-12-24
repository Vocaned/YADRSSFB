# syntax=docker/dockerfile:1

FROM node:alpine
WORKDIR /app
COPY . /app

RUN npm i
RUN tsc

CMD ["node", "dist/index.js"]
