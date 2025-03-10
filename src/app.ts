// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import * as _ from "lodash";
import WebSocket from "ws";
import { Auth } from "./auth";

// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConversationState,
  MemoryStorage,
} from "botbuilder";

// Import required bot configuration.

import { aiRouter } from "./ai";
import config from "./config";
import azureDevOpsRouter from "./devops/read-git-file";
import { smeRouter } from "./sme-router";
import { TeamsBot } from "./teams-bot";
import { printableJson } from "./utils";

// // Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about to learn more about bot adapter.
// const adapter = new BotFrameworkAdapter({
//   appId: config.microsoftAppID,
//   appPassword: config.microsoftAppPassword,
// });

console.log("CERT_THUMBPRINT: \n" + config.CERT_THUMBPRINT + "\n");
console.log("CERT_PRIVATE_KEY_PEM: \n" + config.CERT_PRIVATE_KEY_PEM);

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: config.microsoftAppID,
  CertificateThumbprint: config.CERT_THUMBPRINT,
  CertificatePrivateKey: config.CERT_PRIVATE_KEY_PEM,
});

export const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for any unhandled errors in your bot.
adapter.onTurnError = async (turnContext, error) => {
  // This check writes out errors to console log .vs. app insights.
  console.error(`\n [onTurnError]: ${error}`);
  // Send a message to the user.
  turnContext.sendActivity(`Oops. Something went wrong!`);
  // Clear out state and save changes so the user is not stuck in a bad state.
  await conversationState.clear(turnContext);
  await conversationState.saveChanges(turnContext);
};

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.
let conversationState: ConversationState;

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
conversationState = new ConversationState(memoryStorage);

// CAUTION: You must ensure your product environment has the NODE_ENV set
//          to use the Azure Blob storage or Azure Cosmos DB providers.
// import { BlobStorage } from 'botbuilder-azure';
// Storage configuration name or ID from .bot file
// const STORAGE_CONFIGURATION_ID = '<STORAGE-NAME-OR-ID-FROM-BOT-FILE>';
// // Default container name
// const DEFAULT_BOT_CONTAINER = '<DEFAULT-CONTAINER>';
// // Get service configuration
// const blobStorageConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID);
// const blobStorage = new BlobStorage({
//     containerName: (blobStorageConfig.container || DEFAULT_BOT_CONTAINER),
//     storageAccountOrConnectionString: blobStorageConfig.connectionString,
// });
// conversationState = new ConversationState(blobStorage);

// Create HTTP server
const app = express();
const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};
app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(Auth.rootPath, Auth.router);
let realSend;
app.use((req, res, next) => {
  const { hostname, url, method, headers, body } = req;
  console.log();
  console.log("[INCOMING REQUEST]");
  console.log(printableJson({ hostname, url, method, headers, body }));
  console.log();

  if (!realSend) {
    realSend = res.send;
    res.send = (...args: any[]) => {
      if (_.isObject(args[0])) {
        console.log();
        console.log("[OUTGOING RESPONSE]");
        console.log(printableJson(args[0]));
        console.log();
      }
      return realSend.apply(res, args);
    };
  }
  next();
});

// Create the TeamsBot.
const bot = new TeamsBot(conversationState);

// Create HTTP & WS server
const server = createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("WebSocket connection established: " + req.url);
  bot.onWebSocketConnection(ws);
});

// Listen for incoming activities and route them to your bot for processing.

app.post("/api/messages", (req, res) => {
  adapter.process(req, res as any, async (turnContext) => {
    turnContext.onSendActivities(async (ctx, activities, next) => {
      console.log();
      console.log("[SEND-ACTIVITIES REQUEST]");
      console.log(printableJson(activities));
      console.log();

      const result = await next();

      console.log();
      console.log("[SEND-ACTIVITIES RESPONSE]");
      console.log(printableJson(result));
      console.log();

      return result;
    });
    await bot.run(turnContext);
  });
});

app.get("/", (req, res) => {
  res.send("OK 100");
  res.end();
});

app.use("/task", bot.getTaskModuleRouter());
app.use("/tab", bot.getTabRouter());
app.use("/messageExtension", bot.getMessageExtensionSettingRouter());
app.use("/webhook", bot.getOutgoingWebhookRouter());
app.use("/devops", azureDevOpsRouter);
app.use("/skillrequest", smeRouter);
app.use(cors());
app.use("/static", express.static(config.dataPrefix));
app.use("/ai", aiRouter);

server.listen(config.port, () => {
  console.log(`\n${app.name} listening on PORT ${config.port}`);
  console.log(
    `\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator.`
  );
  console.log(
    `\nTo talk to your bot, open echobot-with-counter.bot file in the Emulator.`
  );
});
