import { CardFactory, Mention, MessageFactory, TeamsInfo } from "botbuilder";
import { CardGenerator } from "../card-gen";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";

export class MentionBot implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    this.registerTextCommands(teamsBot);
  }

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^mention/i, async (ctx, cmd, args) => {
      const mri = args[0];
      if (mri) {
        const mentioned = await TeamsInfo.getMember(ctx, mri);
        const mention: Mention = {
          type: "mention",
          mentioned,
          text: `<at>${mentioned.name}</at>`,
        };

        const textMsg = MessageFactory.text(`Hello ${mention.text}`);
        textMsg.entities = [mention];

        const card = CardGenerator.adaptive.mention(mentioned);
        const cardMsg = MessageFactory.attachment(card);

        const cardDummy = CardFactory.heroCard(
          "Dummy card",
          "Dummy card to test at-mention in the text coming together with card"
        );
        const cardTextMsg = MessageFactory.list(
          [cardDummy, cardDummy],
          `Hello <at>${mentioned.name}</at>`
        );
        cardTextMsg.attachmentLayout = "carousel";
        cardTextMsg.entities = [mention];

        await ctx.sendActivities([textMsg, cardMsg, cardTextMsg]);
      } else {
        await ctx.sendActivity(
          MessageFactory.text(
            `Use command <pre>info members</pre> to list users ande use <pre>mention AAD_OBJECT_ID</pre> to at-mention a user`
          )
        );
      }
    });
  }
}
