FROM --platform=linux/amd64 node:18

# Create app directory
RUN mkdir /opt/app
WORKDIR /opt/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./tslint.json ./
COPY ./yarn.lock ./

RUN yarn install

# Bundle app source
COPY ./dist ./dist
COPY ./data ./data

EXPOSE 5487
CMD [ "yarn", "start" ]
