import env = require("dotenv");
env.config();

export default {
  microsoftAppID: process.env.MICROSOFT_APP_ID,
  microsoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
  port: process.env.port || process.env.PORT || 5487,
  dataPrefix: "./data",
  host: process.env.HOST,
};
