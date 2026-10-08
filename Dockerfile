FROM node:24-slim

# Create app directory
RUN mkdir /opt/app
WORKDIR /opt/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./yarn.lock ./
# Pin registry to npmjs.org (registry.yarnpkg.com is blocked by the corporate proxy)
COPY ./.yarnrc ./

RUN yarn install

# Remove npm; only yarn is used here, and npm bundles a vulnerable undici (GHSA-vxpw-j846-p89q)
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Bundle app source
COPY ./dist ./dist
COPY ./data ./data

EXPOSE 5487
# Run server directly via yarn (npm is removed); avoids the npm-based start script
CMD [ "yarn", "server" ]
