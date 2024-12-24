# syntax=docker/dockerfile:1

FROM node:alpine
USER 1000
WORKDIR /app
COPY --chown=1000:1000 . /app

RUN npm i
RUN npx tsc

CMD ["node", "dist/index.js"]
