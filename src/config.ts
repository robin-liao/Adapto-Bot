import env = require("dotenv");
env.config();

export default {
  microsoftAppID: process.env.MICROSOFT_APP_ID,
  microsoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
  port: process.env.port || process.env.PORT || 5487,
  dataPrefix: "./data",
  host: process.env.HOST,
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONN,
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS,
  },
};
