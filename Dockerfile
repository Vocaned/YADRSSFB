# syntax=docker/dockerfile:1

FROM node:alpine
WORKDIR /app
COPY . /app

RUN npm i

CMD ["npm", "start"]

