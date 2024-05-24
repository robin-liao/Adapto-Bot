import { InvokeResponse, StatusCodes, TurnContext } from "botbuilder-core";
import _, { values } from "lodash";
import config from "../config";
import {
  UniversalSearchError,
  UniversalSearchItem,
  UniversalSearchRateLimit,
  UniversalSearchRequest,
  UniversalSearchResponse,
  UniversalSearchResultWrapper,
  UniversalSearchStatusCodes,
  UniversalSearchUnauthorized,
} from "../search.interface";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";

export class SearchBot implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerUniversalSearch("xbox", (request, ctx) =>
      this.handleSearch(request, ctx)
    );

    teamsBot.registerUniversalSearch("dta-error500", async (request, ctx) => ({
      status: StatusCodes.OK,
      body: this.getError500(),
    }));

    teamsBot.registerUniversalSearch("dta-error504", async (request, ctx) => ({
      status: StatusCodes.OK,
      body: this.getError504(),
    }));

    teamsBot.registerUniversalSearch("dta-login", async (request, ctx) => ({
      status: StatusCodes.OK,
      body: this.getLogin(),
    }));

    teamsBot.registerUniversalSearch(
      "dta-rate-limit",
      async (request, ctx) => ({
        status: StatusCodes.OK,
        body: this.getRateLimit(),
      })
    );

    teamsBot.registerUniversalSearch("dta-empty", async (request, ctx) => ({
      status: StatusCodes.OK,
      body: this.getNoContent(),
    }));

    teamsBot.registerUniversalSearch("states", (request, ctx) =>
      this.handleSearchForDependentDropdown(request, ctx)
    );
  }

  private async handleSearch(
    request: UniversalSearchRequest,
    ctx: TurnContext
  ): Promise<InvokeResponse<UniversalSearchResponse>> {
    const itemCount = 50;
    const qTxt = request.queryText;
    const results: UniversalSearchItem[] = [
      {
        value: "item-qTxt",
        title: `qTxt title - ${qTxt}`,
        subTitle: `qTxt sub - ${qTxt}`,
      },
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
      ..._.range(3, itemCount).map((i) => ({
        value: `item-${i}`,
        title: `Item ${i} - title`,
        subTitle: `Item ${i} - subtitle`,
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg/258px-Microsoft_Office_Teams_%282018%E2%80%93present%29.svg.png",
      })),
    ];
    const body: UniversalSearchResponse = {
      statusCode: UniversalSearchStatusCodes.Success,
      type: "application/vnd.microsoft.search.searchResponse",
      value: {
        results: results.slice(0, 30),
        totalResultCount: results.length,
        moreResultsAvailable: true,
      },
    };
    return { status: StatusCodes.OK, body };
  }

  private async handleSearchForDependentDropdown(
    request: UniversalSearchRequest,
    ctx: TurnContext
  ): Promise<InvokeResponse<UniversalSearchResponse>> {
    const { selectedCountry = "" } = ctx.activity.value?.data;
    const results: UniversalSearchItem[] = [];

    switch (selectedCountry.toLowerCase()) {
      case "usa":
        results.push(
          ...[
            {
              value: "item-CA",
              title: "CA - California",
            },
            {
              value: "item-FL",
              title: "FL - Florida",
            },
            {
              value: "item-TX",
              title: "TX - Texas",
            },
          ]
        );
        break;
      case "india":
      default:
        results.push(
          ...[
            {
              value: "item-AP",
              title: "AP - Andhra Pradesh",
            },
            {
              value: "item-TN",
              title: "TN - Tamil Nadu",
            },
            {
              value: "item-KA",
              title: "KA - Karnataka",
            },
          ]
        );
        break;
    }

    const body: UniversalSearchResponse = {
      statusCode: UniversalSearchStatusCodes.Success,
      type: "application/vnd.microsoft.search.searchResponse",
      value: {
        results: results.slice(0, 30),
        totalResultCount: results.length,
        moreResultsAvailable: true,
      },
    };
    return { status: StatusCodes.OK, body };
  }

  private getError500(): UniversalSearchError {
    return {
      statusCode: UniversalSearchStatusCodes.InternalServerError,
      type: "application/vnd.microsoft.error",
      value: {
        code: "500",
        message: "error message: internal Server Error",
      },
    };
  }

  private getError504(): UniversalSearchError {
    return {
      statusCode: UniversalSearchStatusCodes.ServiceUnavailable,
      type: "application/vnd.microsoft.error",
      value: {
        code: "504",
        message: "error message: service Unavailable",
      },
    };
  }

  private getLogin(): UniversalSearchUnauthorized {
    return {
      statusCode: UniversalSearchStatusCodes.Unauthorized,
      type: "application/vnd.microsoft.activity.loginRequest",
      value: {
        loginUrl: `${config.host}/auth/loginCallback?accessCode=12345`,
      },
    };
  }

  private getRateLimit(): UniversalSearchRateLimit {
    return {
      statusCode: UniversalSearchStatusCodes.RateLimit,
      type: "application/vnd.microsoft.activity.retryAfter",
      value: 2000, // units in ms
    };
  }

  private getNoContent(): UniversalSearchResultWrapper {
    return {
      statusCode: UniversalSearchStatusCodes.NoContent,
      type: "application/vnd.microsoft.search.searchResponse",
    };
  }
}
