import bodyParser from "body-parser";
import {
  CardFactory,
  MessagingExtensionAttachment,
  MessagingExtensionQuery,
  MessagingExtensionResult,
} from "botbuilder";
import { Router } from "express";
import axios from "axios";
import { OpenAI } from "./openai-api";

export type SMERequest = MessagingExtensionQuery;
export type SMEResponse = MessagingExtensionResult;

export const smeRouter = Router();

smeRouter.use(bodyParser.raw());

smeRouter.get("/", async (req, res) => {
  res.send("Hello!");
});

smeRouter.post("/query-api-yelp", async (req, res) => {
  const query: SMERequest = req.body;
  const queryTxt = (query.parameters?.[0].value as string) || undefined;

  // const location = await findLocation(queryTxt);
  const attachments = await searchYelp(queryTxt, "Seattle");

  const result: SMEResponse = {
    type: "result",
    attachmentLayout: "list",
    attachments,
  };

  res.json(result);
});

const findLocation = async (queryTxt: string, defaultLoc = "Seattle") => {
  const prompt = `gpt figure out the location in the query: "${queryTxt}", and tell me the answer in JSON format of {"location": "<value>"}`;
  try {
    const res = await OpenAI.gpt(prompt);
    const loc = JSON.parse(res).location ?? defaultLoc;
    return loc;
  } catch {
    return defaultLoc;
  }
};

const searchYelp = async (queryTxt: string, location: string, limit = 10) => {
  const api = `https://api.yelp.com/v3/businesses/search?sort_by=best_match&limit=${limit}&location=${location}&term=${queryTxt}`;
  const res = await axios.get(api, {
    headers: {
      Authorization:
        "Bearer AeqjVzlr7pzqRYj372k60a2F9kuPOpmhPaqV-Asa0hhBszQIZtGqqeUfBd1knTHRBFWcfOBfh_jxMBYhDqfNrZxDSrEzeHR84o2SjXYm60R3W99ZsfpmjQPPpGQnZHYx",
    },
  });

  const json: any[] = res.data.businesses;
  const cards = json.map((biz) => {
    const { name, image_url, rating, review_count, price = "" } = biz;
    const card = getAdaptiveCard(biz);
    const meCard: MessagingExtensionAttachment = {
      preview: CardFactory.heroCard(
        name,
        `${rating} star(s) (${review_count} reviews) · ${price}`,
        [image_url]
      ),
      ...CardFactory.adaptiveCard(card),
    };
    return meCard;
  });
  return cards;
};

const getAdaptiveCard = ({
  name,
  image_url,
  url,
  rating,
  review_count,
  price = "",
  display_phone,
  location: { city, state, display_address },
}) => ({
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
  version: "1.5",
  body: [
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: 2,
          items: [
            {
              type: "TextBlock",
              text: name,
              weight: "bolder",
              size: "extraLarge",
              spacing: "none",
              wrap: true,
              style: "heading",
            },
            {
              type: "TextBlock",
              text: `${city}, ${state}`,
              wrap: true,
              spacing: "none",
            },
            {
              type: "TextBlock",
              text: `${rating} star(s) (${review_count} reviews) · ${price}`,
              isSubtle: true,
              spacing: "none",
              wrap: true,
            },
            {
              type: "TextBlock",
              text: `📞 ${display_phone}\n\n🏠 ${display_address.join(", ")}`,
              size: "small",
              wrap: true,
              maxLines: 4,
            },
          ],
        },
        {
          type: "Column",
          width: 1,
          items: [
            {
              type: "Image",
              url: `${image_url}`,
              size: "auto",
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      type: "Action.OpenUrl",
      title: "More Info",
      url,
    },
  ],
});
