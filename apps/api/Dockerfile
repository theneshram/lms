FROM node:20-alpine

# Ensure CA certs are present for TLS to Atlas
RUN apk add --no-cache ca-certificates && update-ca-certificates

WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi
COPY . .
EXPOSE 8080
CMD ["npm","start"]
