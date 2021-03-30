FROM node:12.14.1

# Create app directory
RUN mkdir /opt/app
WORKDIR /opt/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY ./tslint.json ./

# RUN npm set strict-ssl false
RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY ./dist ./dist
COPY ./data ./data

EXPOSE 2266
CMD [ "npm", "start" ]
