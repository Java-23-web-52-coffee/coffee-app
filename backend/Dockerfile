# Stage 1: Build the application
FROM node:26 AS builder
WORKDIR /home/node/app

# Leverage caching by copying package.json and package-lock.json first
COPY package*.json ./
RUN npm install -g npm@latest && npm install



FROM node:24
ARG NODE_ENV=development
ENV NODE_ENV $NODE_ENV
ARG PORT=4200
ENV PORT $PORT
EXPOSE $PORT 9229 9230

WORKDIR ./home/node/app
RUN npm install -g npm@latest
COPY tsconfig.json ./
COPY resolve-extensions-loader.mjs ./
RUN chown node:node -R ./
COPY --from=builder /home/node/app ./
USER node
# run the nodemon binary directly (not via `npm`/`npx`, which re-wrap it and
# swallow SIGTERM, printing a spurious "npm error signal SIGTERM") so the
# signal reaches node and the graceful shutdown handler in src/index.ts runs.
CMD ["./node_modules/.bin/nodemon", "--delay", "1.25", "-e", "ts", "--exec", "node --loader ts-node/esm --no-warnings --loader ./resolve-extensions-loader.mjs ./src/index.ts"]