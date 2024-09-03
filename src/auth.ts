import * as express from "express";
import * as bodyParser from "body-parser";
import cookieParser from "cookie-parser";

import { CardFactory, TurnContext } from "botbuilder";
import config from "./config";

export const teamsSdk = {
  release:
    "https://statics.teams.cdn.office.net/sdk/v1.7.0/js/MicrosoftTeams.min.js",
  debug: "https://statics.teams.cdn.office.net/sdk/v1.7.0/js/MicrosoftTeams.js",
};

class AuthHandler {
  public readonly rootPath = "/auth";
  public readonly router = express.Router();
  private readonly startPath = "/start";
  private readonly loginPath = "/login";
  private readonly loginCallbackPath = "/loginCallback";
  private readonly teamsSdk = teamsSdk.debug;

  constructor() {
    this.router.use(bodyParser.json());
    this.router.use(cookieParser());
    this.router.get(`${this.startPath}/:userId`, (req, res) =>
      this.onAuthStart(req, res)
    );
    this.router.get(this.loginPath, (req, res) => this.onLogin(req, res));
    this.router.get(this.loginCallbackPath, (req, res) =>
      this.onLoginCallback(req, res)
    );
  }

  public getAuthUrl(userId: string) {
    const url = `${config.host}${this.rootPath}${this.startPath}/${userId}/?width=1500&height=1000`;
    return url;
  }

  public getSigninCard(userId: string) {
    const url = this.getAuthUrl(userId);
    return CardFactory.signinCard("Login", url, "Please Login");
  }

  private onAuthStart(req: express.Request, res: express.Response) {
    const {
      params: { userId },
    } = req;
    const body = this.onAuthStartResBody(userId);
    res.contentType("html");
    res.send(body);
  }

  public onLogin(req: express.Request, res: express.Response) {
    const accessCode = "12345";
    const redirectUrl = `${config.host}${this.rootPath}${this.loginCallbackPath}?accessCode=${accessCode}`;
    res.redirect(redirectUrl);
  }

  public onLoginCallback(req: express.Request, res: express.Response) {
    let body: string = "";
    const {
      query: { accessCode },
      cookies: { userId, channelId },
    } = req;
    if (accessCode) {
      const state = `userId=${userId};channelId=${channelId};accessCode=${accessCode}`;
      body = this.onAuthResultBody(true, state);
    } else {
      body = this.onAuthResultBody(false);
    }
    res.contentType("html");
    res.send(body);
  }

  public async verifySigninState(
    ctx: TurnContext,
    state?: string,
    returnCardPayloadOnly?: boolean
  ) {
    const {
      from: { aadObjectId: userId },
      conversation: { conversationType, id: convId },
    } = ctx.activity;
    const channelId = conversationType === "channel" ? convId : "undefined";
    const accessCode = "12345";
    const expected = `userId=${userId};channelId=${channelId};accessCode=${accessCode}`;
    const isValid = state === expected;
    // if is valid --> use access code to exchange token and cache
    const card = CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Large",
          weight: "Bolder",
          text: "SignIn Verification Result",
        },
        {
          type: "TextBlock",
          text: isValid ? "Verified" : "Not Verified",
          size: "Medium",
          color: isValid ? "Good" : "Attention",
          weight: "Bolder",
        },
        {
          type: "TextBlock",
          text: "Expected",
          size: "Medium",
          isSubtle: true,
        },
        {
          type: "Container",
          bleed: true,
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              fontType: "Monospace",
              color: "Dark",
              wrap: true,
              text: expected,
            },
          ],
        },
        {
          type: "TextBlock",
          text: "Obtained",
          size: "Medium",
          isSubtle: true,
        },
        {
          type: "Container",
          bleed: true,
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              fontType: "Monospace",
              color: "Dark",
              wrap: true,
              text: state,
            },
          ],
        },
      ],
    });

    if (returnCardPayloadOnly) {
      return card;
    } else {
      await ctx.sendActivity({
        attachments: [card],
        summary: `signin is valid: ${isValid}`,
      });
    }
  }

  private onAuthStartResBody = (userId: string) => `
    <html>
      <head>
        <script src='${this.teamsSdk}'></script>
      </head>
      <body>
        <h1>hello</h1>
        <h2>user ID = ${userId}</h2>
        <script>
          function redirect() {
            window.location = '${config.host}${this.rootPath}${this.loginPath}';
          }

          microsoftTeams.initialize(() => {
            console.log("Init Done");
            microsoftTeams.getContext((context) => {
              console.dir(context);
              //- Save use and channel id to cookie
              document.cookie = 'userId=' + '${userId}' + '; Path=/';
              if (context.channelId) {
                document.cookie = 'channelId=' + context.channelId + ';Path=/';
              } else {
                document.cookie = 'channelId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
              }
              document.write('cookie = ' + document.cookie);
              document.write('<br/>');
              document.write('context: <br/><pre>' + JSON.stringify(context, null, 2) + '</pre>');
              document.write('<button onClick="redirect()">Redirect</button>');
              // window.location = '${config.host}' + '${this.rootPath}' + '${this.loginPath}';
            });
          });
        </script>
      </body>
    </html>
  `;

  private onAuthResultBody = (succeeded: boolean, state?: string) =>
    succeeded
      ? `
    <html>
      <head>
        <script src='${this.teamsSdk}'></script>
      </head>
      <body>
        <script>
        function execute(ok) {
          console.dir(microsoftTeams);
          microsoftTeams.initialize(() => {
            if (ok) {
              microsoftTeams.authentication.notifySuccess('${state}');
            } else {
              microsoftTeams.authentication.notifyFailure();
            }
          });
        }
        </script>
        <div>State = </div>
        <pre>${state}</pre>
        <div>will send back to bot via <span style="font-family: Courier">microsoftTeams.authentication.notifySuccess()</span></div><br/>
        <button onClick="execute(true)" style="width:64px; height:32px; cursor:pointer">Ok</button>
        <button onClick="execute(false)" style="width:64px; height:32px; cursor:pointer">Notify Failure</button>
        </body>
    </html>
    `
      : `
    <html>
      <head>
        <script src='${this.teamsSdk}'></script>
      </head>
      <body>
        <script>
          microsoftTeams.initialize();
          microsoftTeams.authentication.notifyFailure();
        </script>
        <!-- <button onClick="execute()">Failed</button> -->
      </body>
    </html>
  `;
}

export const Auth = new AuthHandler();
