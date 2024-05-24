import {
  CardAction,
  CardFactory,
  MessageFactory,
  MessagingExtensionAttachment,
  TeamsInfo,
  ThumbnailCard,
} from "botbuilder";
import {
  Activity,
  ActivityTypes,
  Attachment,
  StatusCodes,
} from "botframework-schema";
import _ from "lodash";
import { Auth, teamsSdk } from "../auth";
import { CardGenerator, JsonCardLoader } from "../card-gen";
import { ConvSettingTable } from "../storage/setting-table";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import { getConversationId, isEmail, OneOnOneHelper, sleep } from "../utils";
import * as tm from "../task-modules";
import * as teamsTab from "../tabs";
import { attachments as carouselCards } from "./carousel-attachments";
import config from "../config";
import { Router } from "express";

export class DefaultBot implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    this.registerTextCommands(teamsBot);
    this.registerTaskModules(teamsBot);
    this.registerTabs(teamsBot);
    this.registerInvokes(teamsBot);
    this.registerMsgExt(teamsBot);
  }

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(
      /^adaptiveCard markdownEscape/i,
      async (ctx) => {
        const card = CardGenerator.adaptive.markdownEscape();
        await ctx.sendActivity({ attachments: [card] });
      }
    );

    teamsBot.registerTextCommand(/^image/i, async (ctx) => {
      await ctx.sendActivity({
        textFormat: "markdown",
        text: `__text__ <img src="https://cdn2.iconfinder.com/data/icons/social-icons-33/128/Trello-128.png"/>`,
      });
    });

    teamsBot.registerTextCommand(/^markdown/i, async (ctx) => {
      await ctx.sendActivity({
        textFormat: "markdown",
        text: "`[TEXT](https://www.microsoft.com)`",
      });
    });

    teamsBot.registerTextCommand(/^invoke/i, async (ctx) => {
      const card = CardGenerator.hero.invoke();
      await ctx.sendActivity({ attachments: [card] });
    });

    teamsBot.registerTextCommand(/^messageBack/i, async (ctx) => {
      const card = CardGenerator.thumbnail.messageBack();
      await ctx.sendActivity({
        attachments: [card],
        summary: "a messageBack thumbnail card",
      });
    });

    teamsBot.registerTextCommand(/^signin/i, async (ctx) => {
      const userId = ctx.activity.from.aadObjectId;
      const card = Auth.getSigninCard(userId);
      await ctx.sendActivity({
        attachments: [card],
        summary: "a signin card",
      });
    });

    teamsBot.registerTextCommand(/^setting/i, async (ctx) => {
      const convId = getConversationId(ctx.activity);
      const setting = await new ConvSettingTable(convId).get();
      const card = CardGenerator.adaptive.settingCard(setting);
      await ctx.sendActivity({
        attachments: [card],
      });
    });

    teamsBot.registerTextCommand(/^scrum/i, async (ctx) => {
      const members = await TeamsInfo.getMembers(ctx);
      const card = CardGenerator.adaptive.scrumCard(members);
      await ctx.sendActivity({
        attachments: [card],
      });
    });

    teamsBot.registerTextCommand(/^xss-dos/i, async (ctx) => {
      const url = "ms-cxh-full://0";
      const msg = MessageFactory.text(`<a href="${url}">xss-dos</a>`);
      const card1 = CardFactory.heroCard(
        "title",
        `<a href="${url}">xss-dos</a><img src="${url}" width="64" height="64"/>`,
        undefined,
        [{ type: "openUrl", value: url, title: "OpenUrl" }]
      );
      msg.attachments = [card1];
      await ctx.sendActivity(msg);
    });

    teamsBot.registerTextCommand(/^carousel/i, async (ctx) => {
      const card1 = CardFactory.adaptiveCard({
        body: [{ type: "TextBlock", text: "[url text](https://google.com)" }],
      });
      const card2 = CardFactory.heroCard(
        "no title",
        "[url text](https://google.com)"
      );
      await ctx.sendActivity({
        text: "[url text](https://google.com)",
        textFormat: "markdown",
        attachments: [card1, card1],
        attachmentLayout: "carousel",
      });
    });

    teamsBot.registerTextCommand(/^ai-ux/i, async (ctx) => {
      await ctx.sendActivity({
        type: ActivityTypes.Message,
        text: `Hey I'm a friendly AI bot and I don't mess up during demos :).[1] This is what you sent: ${ctx.activity.text}`,
        channelData: {
          feedbackLoopEnabled: true, // Feedback buttons
        },
        attachments: [CardGenerator.adaptive.getJsonCardOfId(1)],
        entities: [
          {
            type: "https://schema.org/Message",
            "@type": "Message",
            "@context": "https://schema.org",
            "@id": "",
            additionalType: ["AIGeneratedContent"], // AI Generated label
            usageInfo: {
              "@type": "CreativeWork",
              description: "UsageInfo 1 description", // Sensitivity description
              name: "UsageInfo 1", // Sensitivity title
            },
            citation: [
              {
                "@type": "Claim",
                position: 1, // required
                appearance: {
                  "@type": "DigitalDocument",
                  name: "Some secret citation", // required. Title of the citation
                  text: "Text 1", // optional, ignored in teams
                  url: "https://example.com/claim-1",
                  abstract: "Abstract 1",
                  encodingFormat: "text/html", // for now ignored, later used for icon
                  image:
                    "https://botapiint.blob.core.windows.net/tests/Bender_Rodriguez.png",
                  keywords: ["Keyword1 - 1", "Keyword1 - 2", "Keyword1 - 3"],
                  usageInfo: {
                    "@type": "CreativeWork",
                    "@id": "usage-info-1",
                    description: "UsageInfo 1 description",
                    name: "UsageInfo 1",
                    position: 5, // optional, ignored in teams
                    pattern: {
                      // optional, ignored in teams
                      "@type": "DefinedTerm",
                      inDefinedTermSet: "https://www.w3.org/TR/css-values-4/",
                      name: "color",
                      termCode: "#454545",
                    },
                  },
                },
                claimInterpreter: {
                  // optional, ignored in teams
                  "@type": "Project",
                  name: "Claim Interpreter name",
                  slogan: "Claim Interpreter slogan",
                  url: "https://www.example.com/claim-interpreter",
                },
              },
            ],
          },
        ],
      });
    });

    teamsBot.registerTextCommand(/^card/i, async (ctx, _command, args) => {
      const [cardType, name, ...subCommands] = args;

      const types = _.keys(CardGenerator);
      const validType = _.includes(types, cardType);
      if (!validType) {
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<b>Try any of the commands:</b><br/><pre>${types
            .map((type) => `card ${type}`)
            .join("<br/>")}</pre>`,
        });
        return;
      }

      if (!name) {
        const generator: JsonCardLoader = CardGenerator[cardType];
        const names = generator.allJsonCardNames;
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<b>Try any of the commands:</b><br/><pre>card ${cardType} all<br/>${names
            .map((n) => `card ${cardType} ${n}`)
            .join("<br/>")}</pre>`,
        });
        return;
      }

      let repeat = 1;
      if (subCommands?.[0]?.toLowerCase() === "repeat") {
        const num = subCommands?.[1] && parseInt(subCommands?.[1]);
        if (num && num > 0) {
          repeat = num;
        }
      }

      if (name.toLowerCase() === "all") {
        const generator: JsonCardLoader = CardGenerator[cardType];
        const cards = generator.allJsonCards;
        for (const c of cards) {
          await teamsBot.sendCard(ctx, c, false, repeat);
        }
        return;
      }

      let card: Attachment;
      switch (cardType.toLowerCase()) {
        case "adaptive":
          card = CardGenerator.adaptive.getJsonCardIncludingName(name);
          break;

        case "hero":
          card = CardGenerator.hero.getJsonCardIncludingName(name);
          break;

        case "thumbnail":
          card = CardGenerator.thumbnail.getJsonCardIncludingName(name);
          break;

        case "o365":
          card = CardGenerator.o365.getJsonCardIncludingName(name);
          break;

        case "profile":
          card = isEmail(name)
            ? CardGenerator.profile.cardFromUpn(name)
            : CardGenerator.profile.getJsonCardIncludingName(name);
          break;

        case "list":
          card = CardGenerator.list.getJsonCardIncludingName(name);
          break;
      }

      card
        ? await teamsBot.sendCard(ctx, card, undefined, repeat)
        : await ctx.sendActivity("Card Not Found");
    });

    teamsBot.registerTextCommand(/^info/i, async (ctx, _command, args) => {
      const [op, ...subCommands] = args;
      if (!op) {
        await ctx.sendActivity({
          textFormat: "xml",
          text: `<b>Try any of the commands:</b><br/><pre>${[
            "team",
            "channels",
            "members",
          ]
            .map((name) => `info ${name}`)
            .join("<br/>")}</pre>`,
        });
        return;
      }

      const sendInfo = (json: any) =>
        ctx.sendActivity({
          textFormat: "xml",
          text: `<pre>${JSON.stringify(json, null, 2)}</pre>`,
        });

      const sendError = async (error: any) => {
        error.message && (await ctx.sendActivity(error.message));
        error.stack && (await ctx.sendActivity(error.stack));
      };

      try {
        switch (op.toLowerCase()) {
          case "team":
            const info1 = await TeamsInfo.getTeamDetails(ctx);
            await sendInfo(info1);
            break;

          case "channels":
            const info2 = await TeamsInfo.getTeamChannels(ctx);
            await sendInfo(info2);
            break;

          case "members":
            const info3 = await TeamsInfo.getMembers(ctx);
            await sendInfo(info3);
            if (subCommands?.[0] === "mention") {
              const card = CardGenerator.adaptive.mention(...info3);
              await teamsBot.sendCard(ctx, card);
            }
            break;
        }
      } catch (error) {
        await sendError(error);
      }
    });

    teamsBot.registerTextCommand(/^typing/i, async (ctx) => {
      await ctx.sendActivity({
        type: ActivityTypes.Typing,
      });
    });

    teamsBot.registerTextCommand(/^url/i, async (ctx, _command, args) => {
      const [url] = args;
      const attachments = [
        CardFactory.heroCard(
          "Hero Card",
          `<a href="${url}">html href</a><br/>[markdown NOT support](${url})`,
          undefined,
          [{ type: "openUrl", title: "OpenURL", value: url }] as CardAction[]
        ),
        CardFactory.o365ConnectorCard({
          title: "O365 card",
          text: `<a href="${url}">html href</a><br/>[markdown link](${url})`,
          sections: [
            {
              title: "Section 1 - Markdown = true",
              markdown: true,
              text: `<a href="${url}">html href</a><br/>[markdown link](${url})`,
            },
            {
              title: "Section 2 - Markdown = false",
              markdown: false,
              text: `<a href="${url}">html href</a><br/>[markdown link](${url})`,
            },
          ],
        }),
        CardFactory.adaptiveCard({
          body: [
            {
              type: "TextBlock",
              size: "large",
              weight: "Bolder",
              text: "Adaptive Card",
            },
            {
              type: "TextBlock",
              text: `TextBlock: [markdown link](${url})`,
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "Action.OpenUrl",
              url,
            },
          ],
        }),
      ];
      await ctx.sendActivities([
        {
          textFormat: "markdown",
          text: `textFormat = markdown --> [markdown link](${url})`,
        },
        {
          textFormat: "markdown",
          text: `textFormat = markdown --> <a href="${url}">html href</a>`,
        },
        {
          textFormat: "xml",
          text: `textFormat = xml --> [markdown link](${url})`,
        },
        {
          textFormat: "xml",
          text: `textFormat = xml --> <a href="${url}">html href</a>`,
        },
        {
          attachments,
        },
      ]);
    });

    teamsBot.registerTextCommand(/^suggestedAction/i, async (ctx) => {
      await ctx.sendActivity({
        text: "Hello! I have some suggested actions for you. Let me know if you need any help.",
        suggestedActions: {
          to: [ctx.activity.from.id],
          actions: [
            {
              type: "imBack",
              title: "1",
              value: "imBack value",
            },
            {
              type: "imBack",
              title: "2",
              value: JSON.stringify({ key: "value" }),
            },
            {
              type: "imBack",
              title: "3",
              value: JSON.stringify({ key: "value" }),
            },
            {
              type: "imBack",
              title: "4",
              value: "imBack value",
            },
            {
              type: "imBack",
              title: "5",
              value: JSON.stringify({ key: "value" }),
            },
            {
              type: "imBack",
              title: "6",
              value: "imBack value",
            },
            {
              type: "imBack",
              title: "7",
              value: JSON.stringify({ key: "value" }),
            },
          ],
        },
      });
    });
  }

  private registerInvokes(teamsBot: IScenarioBuilder) {
    teamsBot.registerInvoke("updateCard", async (ctx) => {
      const value = ctx.activity.value;

      const activity: Partial<Activity> = {
        type: ActivityTypes.Message,
        id: ctx.activity.replyToId,
      };
      switch (value.update) {
        case "toText":
          activity.text = value.text;
          return { status: StatusCodes.OK };

        case "toAdaptiveCard":
          const newCard = CardGenerator.adaptive.getJsonCardOfId(35);
          activity.attachments = [newCard];
          break;

        default:
          const updateCard =
            CardGenerator.hero.getJsonCardIncludingName("update");
          updateCard.content.text = value.text;
          activity.attachments = [updateCard];
      }
      await ctx.updateActivity(activity);
      return { status: StatusCodes.OK };
    });

    teamsBot.registerInvoke("deleteCard", async (ctx) => {
      await ctx.deleteActivity(ctx.activity.replyToId);
      return { status: StatusCodes.OK };
    });

    teamsBot.registerInvoke("delay", async (ctx) => {
      const value = ctx.activity.value;
      await sleep(value.delay);
      return { status: StatusCodes.OK };
    });

    teamsBot.registerInvoke("setting", async (ctx) => {
      const value = ctx.activity.value;
      const convId = getConversationId(ctx.activity);
      const tbl = new ConvSettingTable(convId);
      const { echoAllTeamsEvents, echoMessage, echoMessageReaction } = value;
      await tbl.update({
        ...(echoAllTeamsEvents && {
          echoAllTeamsEvents: echoAllTeamsEvents === "true" ? true : false,
        }),
        ...(echoMessage && {
          echoMessage: echoMessage === "true" ? true : false,
        }),
        ...(echoMessageReaction && {
          echoMessageReaction: echoMessageReaction === "true" ? true : false,
        }),
      });
      const newSetting = await tbl.get();
      const newSettingCard = CardGenerator.adaptive.settingCard(newSetting);
      await ctx.updateActivity({
        type: ActivityTypes.Message,
        id: ctx.activity.replyToId,
        attachments: [newSettingCard],
      });
      return { status: StatusCodes.OK };
    });

    teamsBot.registerInvoke("scrum", async (ctx) => {
      const value = ctx.activity.value;
      const doneUpdate = JSON.parse(value.hiddenData ?? {});
      const updateText = value.updateText ?? "";
      const userId = value.userId;
      if (userId) {
        doneUpdate[userId] = updateText;
      }
      const members = await TeamsInfo.getMembers(ctx);
      const updateCard = CardGenerator.adaptive.scrumCard(members, doneUpdate);
      await ctx.updateActivity({
        type: ActivityTypes.Message,
        id: ctx.activity.replyToId,
        attachments: [updateCard],
      });
      return { status: StatusCodes.OK };
    });
  }

  private registerMsgExt(teamsBot: IScenarioBuilder) {
    const cmdId = "queryCards";

    teamsBot.registerMessageExtensionQuery(cmdId, async (ctx, query) => {
      const attachments: MessagingExtensionAttachment[] = [];
      const queryTxt = (query.parameters?.[0].value as string) || undefined;

      // cards from JSON
      const cards = CardGenerator.adaptive.allJsonCardsWithName;
      const jsonCards: MessagingExtensionAttachment[] = cards
        .filter(([name, _card]) =>
          queryTxt ? name.toLowerCase().includes(queryTxt.toLowerCase()) : true
        )
        .map(
          ([name, card]): MessagingExtensionAttachment => ({
            ...card,
            preview: {
              contentType: CardFactory.contentTypes.thumbnailCard,
              content: {
                title: name,
                subtitle: name,
                text: name,
              } as ThumbnailCard,
            },
          })
        );
      attachments.push(...jsonCards);

      // cards generated dynamically
      const invokeCard = CardGenerator.hero.invoke();
      attachments.push(invokeCard);

      // mention card
      try {
        const members = await TeamsInfo.getMembers(ctx);
        const mentionCard: MessagingExtensionAttachment = {
          preview: CardFactory.heroCard("mention card"),
          ...CardGenerator.adaptive.mention(...members),
        };
        attachments.push(mentionCard);
      } catch {
        console.log("skip inserting mention card");
      }

      return {
        composeExtension: {
          type: "result",
          attachmentLayout: "list",
          attachments,
        },
      };
    });

    teamsBot.registerMessageExtensionSetting(cmdId, {
      querySettingUrl: async (ctx, query) => ({
        composeExtension: {
          type: "config",
          suggestedActions: {
            actions: [
              {
                type: "openUrl",
                title: "ME Setting",
                value: `${config.host}/messageExtension/${cmdId}/setting`,
              },
            ],
          },
        },
      }),

      getRouter: () => {
        const router = Router();
        router.get("/setting", (req, res) => {
          const html = `
          <html>
            <head>
              <script src='${teamsSdk.release}'></script>
            </head>
            <body>
              <script>
              function execute(ok) {
                console.dir(microsoftTeams);
                microsoftTeams.initialize(() => {
                  if (ok) {
                    const val = document.getElementById("setting").value;
                    microsoftTeams.authentication.notifySuccess(val);
                  } else {
                    microsoftTeams.authentication.notifyFailure();
                  }
                });
              }
              </script>
              <div>Enter your setting: </div>
              <input type="text" id="setting" value="">
              <div>will send back to bot via <span style="font-family: Courier">microsoftTeams.authentication.notifySuccess()</span></div><br/>
              <button onClick="execute(true)" style="width:64px; height:32px; cursor:pointer">Ok</button>
              <button onClick="execute(false)" style="width:64px; height:32px; cursor:pointer">Notify Failure</button>
            </body>
          </html>
          `;
          res.contentType("html");
          res.send(html);
        });
        return router;
      },

      updateSettings: async (ctx, settings) => {
        const msg: Partial<Activity> = {
          type: "message",
          textFormat: "xml",
          text: `
            <strong>Message Extension Setting Update!</strong>
            <pre>${JSON.stringify(settings, null, 2)}</pre>
          `,
        };
        await OneOnOneHelper.sendOneOnOneMessage(ctx, msg);
      },
    });
  }

  private registerTaskModules(teamsBot: IScenarioBuilder) {
    teamsBot.registerTaskModule("oneStep", new tm.TaskModuleOneStep("oneStep"));
    teamsBot.registerTaskModule(
      "createCard",
      new tm.TaskModuleCardCreate("createCard")
    );
    teamsBot.registerTaskModule(
      "createWithPreview",
      new tm.TaskModuleCardCreate("createWithPreview")
    );
  }

  private registerTabs(teamsBot: IScenarioBuilder) {
    teamsBot.registerTab(
      "tab-adaptivecard-settings",
      new teamsTab.SettingTab()
    );

    teamsBot.registerTab("tab-adaptivecard-sandbox", new teamsTab.SandboxTab());
  }
}
