FROM node:lts-alpine

RUN apk add iptables xtables-addons

COPY . /app
WORKDIR /app
RUN npm install --omit=dev

ENTRYPOINT ["node", "src/main.js"]
