FROM node:lts-alpine
RUN apk add --no-cache ca-certificates
COPY . /usr/app
RUN npm install
ENTRYPOINT ["node", "/usr/app/index.js"]
