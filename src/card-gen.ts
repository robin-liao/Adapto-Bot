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
} from "botbuilder";
import { JsonFile } from "./utils";
import config from "./config";
import * as _ from "lodash";
import * as fs from "fs";

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
          text:
            "[#329 \\\\h ](https://github.com/apurva1112/LicenseAPITestModuleABC/issues/329)",
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

export const CardGenerator = {
  hero: new HeroCardGenerator(),
  thumbnail: new ThumbnailCardGenerator(),
  adaptive: new AdaptiveCardGenerator(),
  o365: new O365CardGenerator(),
  profile: new ProfileCardGenerator(),
  list: new ListCardGenerator(),
};
