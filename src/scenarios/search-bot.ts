import { InvokeResponse, StatusCodes, TurnContext } from "botbuilder-core";
import {
  UniversalSearchItem,
  UniversalSearchRequest,
  UniversalSearchResponse,
  UniversalSearchStatusCodes,
} from "../search.interface";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";

export class SearchBot implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerUniversalSearch("xbox", (request, ctx) =>
      this.handleSearch(request, ctx)
    );
  }

  private async handleSearch(
    request: UniversalSearchRequest,
    ctx: TurnContext
  ): Promise<InvokeResponse<UniversalSearchResponse>> {
    const qTxt = request.queryText;
    const results: UniversalSearchItem[] = [
      {
        value: "item-1",
        title: "Item 1 - title",
        subTitle: "Item 1 - subtitle",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Tango_Style_Mushroom_icon.svg/240px-Tango_Style_Mushroom_icon.svg.png",
      },
      {
        value: "item-2",
        title: `Item 2 - title`,
        subTitle: "Item 2 - subtitle",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg/258px-Microsoft_Office_Teams_%282018%E2%80%93present%29.svg.png",
      },
      {
        value: "item-qTxt",
        title: `qTxt title - ${qTxt}`,
        subTitle: `qTxt sub - ${qTxt}`,
      },
    ];
    const body: UniversalSearchResponse = {
      statusCode: UniversalSearchStatusCodes.Success,
      type: "application/vnd.microsoft.search.searchResponse",
      value: {
        results,
        totalResultCount: results.length,
      },
    };
    return { status: StatusCodes.OK, body };
  }
}
