# Adapto Bot

- ## Development

  1. Run up [ngrok](https://ngrok.com/) at port 5487:
  ```shell
  ~/Adapto-Bot$ ./ngrok http -host-header="localhost" 5487
  ```

  2. set up `.env`:
  ```bash
  MICROSOFT_APP_ID={{YOUR_BOT_ID}}
  MICROSOFT_APP_PASSWORD={{YOUR_BOT_PASSWORD}}
  # HOST should be root path given by ngrok without suffix /api/messages
  HOST=https://090e6077b645.ngrok.io
  ```

  3. Run
  ```
  ~/Adapto-Bot$ npm i
  ~/Adapto-Bot$ npm run dev
  ```

  4. After run up, your bot is listening at `https://090e6077b645.ngrok.io/api/messages`

- ## Deployment

  1. Run 
  ```
  ~/Adapto-Bot$ npm run build
  ```

  2. Prepare docker image ([Dockerfile](./Dockerfile) is at root path) and push built image. You may create an executable shell script:
  ```bash
  HOST="{{DOCKER REGISTRY HOST}}"
  IMG_TAG="adapto-v4-bot:latest"
  USER="{{DOCKER REGISTRY USERNAME}}"
  PASS="{{DOCKER REGISTRY PASSWORD}}"

  npm run build

  docker build -t $IMG_TAG .
  docker login $HOST -u $USER -p $PASS
  docker tag $IMG_TAG $HOST/$USER/$IMG_TAG
  docker push $HOST/$USER/$IMG_TAG
  ```