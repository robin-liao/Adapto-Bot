import {
  CardFactory,
  Attachment,
  HeroCard,
  ActionTypes,
  ThumbnailCard,
  O365ConnectorCard,
  O365ConnectorCardOpenUri,
  TeamsChannelAccount,
  Mention,
  FileConsentCard,
  FileInfoCard,
} from "botbuilder";
import { JsonFile } from "./utils";
import config from "./config";
import * as _ from "lodash";
import * as fs from "fs";
import { ConvSetting } from "./storage/setting-table";

interface ITypedAttachment<T = any> extends Attachment {
  content?: T;
}

interface IJsonCardLoader {
  name: string;
  load: () => JsonFile;
}

export class JsonCardLoader<T = any> {
  constructor(private folder: string, private contentType: string) {}

  public getJsonCardOfId(id: number): ITypedAttachment<T> | undefined {
    const json = this.jsonCardLoader[id - 1]?.load().obj;
    return json && this.toAttachment(json);
  }

  public getJsonCardIncludingName(
    name: string
  ): ITypedAttachment<T> | undefined {
    const card = this.allJsonCardsWithName.find(([fullname]) =>
      fullname.toLowerCase().includes(name.toLowerCase())
    );
    return card?.[1];
  }

  public get allJsonCardNames(): string[] {
    return _.map(this.jsonCardLoader, ({ name }) => name);
  }

  public get allJsonCards(): ITypedAttachment<T>[] {
    return _.map(this.jsonCardLoader, (loader) =>
      this.toAttachment(loader.load().obj)
    );
  }

  public get allJsonCardsWithName(): [string, ITypedAttachment<T>][] {
    return _.map(this.jsonCardLoader, (loader) => [
      loader.name,
      this.toAttachment(loader.load().obj),
    ]);
  }

  private get jsonCardLoader(): IJsonCardLoader[] {
    const files = fs
      .readdirSync(this.folder)
      .filter((f) => f.endsWith(".json"));
    return files.map((fname) => ({
      name: _.last(fname.split("/")).replace(".json", ""),
      load: () => new JsonFile(`${this.folder}/${fname}`),
    }));
  }

  protected toAttachment(content: any): ITypedAttachment<T> {
    return {
      contentType: this.contentType,
      content,
    };
  }
}

class AdaptiveCardGenerator extends JsonCardLoader<any> {
  constructor() {
    super(
      config.dataPrefix + "/adaptive-card-samples",
      CardFactory.contentTypes.adaptiveCard
    );
  }

  public markdownEscape(): ITypedAttachment {
    return CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      body: [
        {
          type: "TextBlock",
          text: "Comment by **apurva1112**",
        },
        {
          type: "TextBlock",
          text: "[#329 \\\\h ](https://github.com/apurva1112/LicenseAPITestModuleABC/issues/329)",
        },
      ],
    });
  }

  public mention(...users: TeamsChannelAccount[]): ITypedAttachment {
    const entities: Mention[] = users.map((user) => ({
      type: "mention",
      text: `<at>${user.name}</at>`,
      mentioned: {
        id: user.id,
        name: user.name,
      },
    }));

    const mentions = entities.map((entity) => ({
      type: "TextBlock",
      text: entity.text,
    }));

    return CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      body: mentions,
      msTeams: {
        entities,
      },
    });
  }

  public appBasedLinkCard(url: string = ""): ITypedAttachment {
    return CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      body: [
        {
          type: "TextBlock",
          text: url,
        },
      ],
    });
  }

  public settingCard(setting: Partial<ConvSetting> = {}) {
    return CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "large",
          weight: "bolder",
          text: "Settings",
        },
        {
          type: "Input.Toggle",
          id: "echoAllTeamsEvents",
          title: "Echo all teams / channel events",
          value: setting.echoAllTeamsEvents ? "true" : "false",
          valueOn: "true",
          valueOff: "false",
        },
        {
          type: "Input.Toggle",
          id: "echoMessage",
          title: "Echo incoming messages",
          value: setting.echoMessage ? "true" : "false",
          valueOn: "true",
          valueOff: "false",
        },
        {
          type: "Input.Toggle",
          id: "echoMessageReaction",
          title: "Echo message reactions",
          value: setting.echoMessageReaction ? "true" : "false",
          valueOn: "true",
          valueOff: "false",
        },
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "Update",
          data: {
            intent: "setting",
          },
        },
      ],
    });
  }

  public scrumCard(
    users: TeamsChannelAccount[],
    doneUpdate: { [userId: string]: string } = {}
  ): ITypedAttachment {
    const doneUserId = _.keys(doneUpdate);
    const usersNotDone = _.filter(
      users,
      (user) => !doneUserId.includes(user.id)
    );
    const allDone = usersNotDone.length === 0 ? "✅ " : "";
    const entities: Mention[] = usersNotDone.map((user) => ({
      type: "mention",
      text: `<at>${user.name}</at>`,
      mentioned: {
        id: user.id,
        name: user.name,
      },
    }));

    return CardFactory.adaptiveCard({
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Large",
          weight: "Bolder",
          text: `${allDone}Scrum on ${new Date()
            .toJSON()
            .slice(0, 10)
            .replace(/-/g, "/")}`,
        },
        ...users.map((user, id) =>
          doneUserId.includes(user.id)
            ? this.scrumItem(
                user.id,
                user.name,
                id,
                doneUpdate,
                true,
                doneUpdate[user.id]
              )
            : this.scrumItem(user.id, `<at>${user.name}</at>`, id, doneUpdate)
        ),
      ],
      msTeams: {
        entities,
      },
    });
  }

  private scrumItem(
    userId: string,
    name: string,
    id: number,
    data: any = {},
    done = false,
    updatedText?: string
  ) {
    return {
      type: "Container",
      separator: true,
      spacing: "Large",
      items: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              verticalContentAlignment: "Center",
              items: [
                {
                  type: "TextBlock",
                  text: `${done ? "👍 " : ""}${name}`,
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              horizontalAlignment: "Right",
              items: [
                ...(done
                  ? []
                  : [
                      {
                        type: "ActionSet",
                        id: `actionset-${id}`,
                        actions: [
                          {
                            type: "Action.ToggleVisibility",
                            title: "Write Update",
                            targetElements: [
                              `actionset-${id}`,
                              `inputpane-${id}`,
                            ],
                          },
                          {
                            type: "Action.Submit",
                            title: "Mark as Done",
                            data: {
                              intent: "scrum",
                              userId,
                            },
                          },
                        ],
                      },
                    ]),
                ...(done && !!updatedText
                  ? [
                      {
                        type: "ActionSet",
                        id: `actionset-${id}`,
                        actions: [
                          {
                            type: "Action.ToggleVisibility",
                            title: "Show Update",
                            targetElements: [
                              `actionset-${id}`,
                              `inputpane-${id}`,
                            ],
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        {
          type: "Container",
          style: "emphasis",
          bleed: true,
          id: `inputpane-${id}`,
          isVisible: false,
          items: [
            ...(done && !!updatedText
              ? [
                  {
                    type: "TextBlock",
                    text: updatedText ?? "",
                  },
                  {
                    type: "ActionSet",
                    actions: [
                      {
                        type: "Action.ToggleVisibility",
                        title: "Close",
                        targetElements: [`inputpane-${id}`, `actionset-${id}`],
                      },
                    ],
                  },
                ]
              : []),
            ...(done
              ? []
              : [
                  {
                    type: "Input.Text",
                    id: "updateText",
                    placeholder: "Post update here...",
                    isMultiline: true,
                  },
                  {
                    type: "ActionSet",
                    actions: [
                      {
                        type: "Action.Submit",
                        title: "Submit",
                        data: {
                          intent: "scrum",
                          userId,
                        },
                      },
                      {
                        type: "Action.ToggleVisibility",
                        title: "Cancel",
                        targetElements: [`inputpane-${id}`, `actionset-${id}`],
                      },
                    ],
                  },
                ]),
          ],
        },
        {
          type: "Input.Text",
          id: "hiddenData",
          isVisible: false,
          value: JSON.stringify(data),
        },
      ],
    };
  }
}

class HeroCardGenerator extends JsonCardLoader<HeroCard> {
  constructor() {
    super(
      config.dataPrefix + "/hero-card-samples",
      CardFactory.contentTypes.heroCard
    );
  }

  public invoke(): ITypedAttachment<Partial<HeroCard>> {
    const rand = () => [Math.random(), Math.random(), Math.random()];
    const payload = (delay: number) =>
      JSON.stringify({ intent: "delay", randomNumber: rand(), delay });

    return {
      contentType: CardFactory.contentTypes.heroCard,
      content: {
        title: "Invoke Card",
        buttons: [
          { type: "invoke", title: "Click Me", value: payload(1000) },
          { type: "invoke", title: "Click Me", value: payload(2000) },
          { type: "invoke", title: "Click Me", value: payload(3000) },
          { type: "invoke", title: "Click Me", value: payload(4000) },
          { type: "invoke", title: "Click Me", value: payload(5000) },
        ],
      },
    };
  }
}

class ThumbnailCardGenerator extends JsonCardLoader<ThumbnailCard> {
  constructor() {
    super(
      config.dataPrefix + "/thumbnail-card-samples",
      CardFactory.contentTypes.thumbnailCard
    );
  }

  public messageBack(): ITypedAttachment<Partial<ThumbnailCard>> {
    return {
      contentType: CardFactory.contentTypes.thumbnailCard,
      content: {
        buttons: [
          {
            type: ActionTypes.MessageBack,
            title: "Message back 1",
            text: "User clicked MessageBack button 1",
            displayText: "I just clicked MessageBack button 1",
            value: "text",
          },
          {
            type: ActionTypes.MessageBack,
            title: "Message back 2",
            text: "User clicked MessageBack button 2",
            displayText: "I just clicked MessageBack button 2",
            value: {
              text: "some text 2",
            },
          },
        ],
      },
    };
  }
}

class O365CardGenerator extends JsonCardLoader<O365ConnectorCard> {
  constructor() {
    super(
      config.dataPrefix + "/o365-card-samples",
      CardFactory.contentTypes.o365ConnectorCard
    );
  }
}

class ProfileCardGenerator extends JsonCardLoader<any> {
  constructor() {
    super(
      config.dataPrefix + "/profile-card-samples",
      "application/vnd.microsoft.teams.card.profile"
    );
  }

  public cardFromUpn(upn: string): ITypedAttachment<any> {
    return super.toAttachment({
      upn,
      buttons: [
        {
          type: "imback",
          title: "Availability",
          value: "availability lajin@microsoft.com",
        },
        {
          type: "imback",
          title: "Reports To",
          value: "reportsto lajin@microsoft.com",
        },
        {
          type: "imback",
          title: "Recent Files",
          value: "recentfiles lajin@microsoft.com",
        },
      ],
      tap: {
        type: "imback",
        value: "chat lajin@microsoft.com",
      },
    });
  }
}

class ListCardGenerator extends JsonCardLoader<any> {
  constructor() {
    super(
      config.dataPrefix + "/list-card-samples",
      "application/vnd.microsoft.teams.card.list"
    );
  }
}

class FileCardGenerator {
  public readonly contentTypeOfConsentCard =
    "application/vnd.microsoft.teams.card.file.consent";
  public readonly contentTypeOfInfoCard =
    "application/vnd.microsoft.teams.card.file.info";

  public createConsentCard(
    fileCard: FileConsentCard,
    filename?: string
  ): Attachment {
    const card: Attachment = {
      contentType: this.contentTypeOfConsentCard,
      content: fileCard,
      ...(filename && { name: filename }),
    };
    return card;
  }

  public createInfoCard(
    fileCard: FileInfoCard,
    filename?: string,
    contentUrl?: string
  ): Attachment {
    const card: Attachment = {
      contentType: this.contentTypeOfInfoCard,
      content: fileCard,
      ...(filename && { name: filename }),
      ...(contentUrl && { contentUrl }),
    };
    return card;
  }
}

export const CardGenerator = {
  hero: new HeroCardGenerator(),
  thumbnail: new ThumbnailCardGenerator(),
  adaptive: new AdaptiveCardGenerator(),
  o365: new O365CardGenerator(),
  profile: new ProfileCardGenerator(),
  list: new ListCardGenerator(),
  file: new FileCardGenerator(),
};
