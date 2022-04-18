import { Activity, CardFactory, MessageFactory } from "botbuilder";
import { Request, Router } from "express";
import { printableJson } from "./utils";
import * as crypto from "crypto";
import bodyParser from "body-parser";
import config from "./config";

export const outgoingWebhookRouter = Router();

outgoingWebhookRouter.use(bodyParser.raw());

outgoingWebhookRouter.post("/", (req, res) => {
  const secret = config.outgoingWebhook.secret;
  const { hashCheck, hashComputed, verified } = hmacAuthorize(secret, req);

  const card = CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.3",
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        size: "Large",
        weight: "Bolder",
        text: "HMAC Hash Verification Result",
      },
      {
        type: "TextBlock",
        text: verified ? "Verified" : "Not Verified",
        size: "Medium",
        color: verified ? "Good" : "Attention",
        weight: "Bolder",
      },
      {
        type: "TextBlock",
        text: "Expected Hash",
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
            text: hashCheck,
          },
        ],
      },
      {
        type: "TextBlock",
        text: "Computed Hash",
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
            text: hashComputed,
          },
        ],
      },
      {
        type: "TextBlock",
        text: "Hash Used",
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
            text: secret,
          },
        ],
      },
    ],
  });

  const message: Partial<Activity> = {
    type: "message",
    textFormat: "xml",
    text: `
      <strong>Payload Received</strong><br/>
      <pre>${JSON.stringify(req.body, null, 2)}</pre>`,
    attachments: [card],
  };

  res.json(message);
});

const hmacAuthorize = (
  key: string,
  req: Request
): { hashCheck?: string; hashComputed?: string; verified: boolean } => {
  const keyBuf = Buffer.from(key, "base64");
  const auth = req.header("Authorization");
  const authTokens = auth.split(/\s+/);
  if (authTokens.length === 2 && authTokens[0].toUpperCase() === "HMAC") {
    const hashCheck = authTokens[1];
    const hashComputed = crypto
      .createHmac("sha256", keyBuf)
      .update((req as any).rawBody)
      .digest("base64");
    return {
      hashCheck,
      hashComputed,
      verified: hashComputed === hashCheck,
    };
  } else {
    return { verified: false };
  }
};
