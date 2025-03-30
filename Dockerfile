FROM node:lts-alpine

LABEL org.opencontainers.image.source=https://github.com/1RandomDev/iptables-web-ui

RUN apk add iptables xtables-addons conntrack-tools

COPY . /app
WORKDIR /app
RUN npm install --omit=dev

VOLUME /app/data
ENTRYPOINT ["node", "src/main.js"]
