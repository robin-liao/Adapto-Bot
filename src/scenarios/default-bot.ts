import {
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
