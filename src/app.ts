// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import express from "express";
import * as bodyParser from "body-parser";
import * as _ from "lodash";
import cors from "cors";
import { Auth } from "./auth";

// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
import {
  BotFrameworkAdapter,
  ConversationState,
  MemoryStorage,
  ConfigurationBotFrameworkAuthentication,
  CloudAdapter,
} from "botbuilder";

// Import required bot configuration.
import { BotConfiguration, IEndpointService } from "botframework-config";

import { TeamsBot } from "./teams-bot";
import config from "./config";
import { printableJson } from "./utils";
import azureDevOpsRouter from "./devops/read-git-file";
import { smeRouter } from "./sme-router";
import { aiRouter } from "./ai";

// Read botFilePath and botFileSecret from .env file
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
// const ENV_FILE = path.join(__dirname, "..", ".env");
// const loadFromEnv = config({ path: ENV_FILE });

// // Get the .bot file path
// // See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.
// const BOT_FILE = path.join(__dirname, '..', (process.env.botFilePath || ''));
// let botConfig;
// try {
//     // read bot configuration from .bot file.
//     botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
// } catch (err) {
//     console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
//     console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
//     console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.`);
//     console.error(`\n - See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.\n\n`);
//     process.exit();
// }

// // For local development configuration as defined in .bot file.
// const DEV_ENVIRONMENT = 'development';

// // Define name of the endpoint configuration section from the .bot file.
// const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);

// // Get bot endpoint configuration by service name.
// // Bot configuration as defined in .bot file.
// const endpointConfig = <IEndpointService>botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

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

const adapter = new CloudAdapter(botFrameworkAuthentication);

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
app.use("/messageExtension", bot.getMessageExtensionSettingRouter());
app.use("/webhook", bot.getOutgoingWebhookRouter());
app.use("/devops", azureDevOpsRouter);
app.use("/skillrequest", smeRouter);
app.use(cors());
app.use("/static", express.static(config.dataPrefix));
app.use("/ai", aiRouter);

app.listen(config.port, () => {
  console.log(`\n${app.name} listening on PORT ${config.port}`);
  console.log(
    `\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator.`
  );
  console.log(
    `\nTo talk to your bot, open echobot-with-counter.bot file in the Emulator.`
  );
});
