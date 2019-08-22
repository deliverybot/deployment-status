FROM node:lts-alpine
RUN apk add --no-cache ca-certificates
COPY . /usr/app
WORKDIR /usr/app
RUN npm install
ENTRYPOINT ["node", "index.js"]
