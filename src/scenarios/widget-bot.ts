import { TurnContext } from "botbuilder";
import { ITeamsScenario, IScenarioBuilder } from "../teams-bot";
import { TEST_MCP_WIDGET_MARKDOWN } from "../widget/test-widget/capability-lab-widget-markdown";
import { generateRadioWidgetMarkdown } from "../widget/radio-widget/radio-widget-markdown";
import { generateCallbacksWidgetMarkdown } from "../widget/callback-widget/callbacks-widget-markdown";
import {
  makeWeatherSnapshot,
  toCallToolResult,
} from "../widget/weather-widget/weather";

// `widget WIDGET_NAME ARG1, ARG2, ...`
const WIDGET_PATTERN = /^widget\b\s*(\S*)\s*([\s\S]*)$/i;

interface IWidget {
  description: string;
  usage: string;
  render(args: string[]): Promise<string> | string;
}

const WIDGETS: Record<string, IWidget> = {
  test: {
    description: "MCP capability lab test widget",
    usage: "widget test",
    render: () => TEST_MCP_WIDGET_MARKDOWN,
  },
  radio: {
    description: "World radio tuner",
    usage: "widget radio [query], [country], [tag]",
    render: ([query, country, tag]) =>
      generateRadioWidgetMarkdown({ query, country, tag }),
  },
  callback: {
    description:
      "Weather widget exercising host callbacks (calltool, ui/message, ...)",
    usage: "widget callback",
    render: () => generateCallbacksWidgetMarkdown(),
  },
};

export function parseWidgetCommand(text: string) {
  const match = text.trim().match(WIDGET_PATTERN);
  if (!match) return undefined;
  const name = match[1].toLowerCase();
  const args = match[2].trim()
    ? match[2].split(",").map((arg) => arg.trim())
    : [];
  return { name, args };
}

function helpText() {
  const lines = Object.entries(WIDGETS).map(
    ([name, w]) => `- **${name}**: ${w.description} — \`${w.usage}\``,
  );
  return ["Usage: `widget WIDGET_NAME ARG1, ARG2, ...`", "", ...lines].join(
    "\n",
  );
}

export class WidgetBot implements ITeamsScenario {
  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerHtmlWidgetCalltoolHandler(
      "getWeather",
      async (_ctx, args) =>
        toCallToolResult(makeWeatherSnapshot(args?.location || undefined)),
    );

    teamsBot.registerTextCommand(WIDGET_PATTERN, async (ctx) => {
      // Re-parse the full text: the dispatcher's args are whitespace-split.
      const text = TurnContext.removeRecipientMention(ctx.activity) ?? "";
      const { name, args } = parseWidgetCommand(text) ?? { name: "", args: [] };
      const widget = WIDGETS[name];

      if (!widget) {
        const prefix = name ? `Unknown widget \`${name}\`.\n\n` : "";
        await ctx.sendActivity({
          type: "message",
          textFormat: "markdown",
          text: prefix + helpText(),
        });
        return;
      }

      try {
        await ctx.sendActivity({
          type: "message",
          textFormat: "extendedmarkdown",
          text: await widget.render(args),
        } as any);
      } catch (err) {
        await ctx.sendActivity(
          `Sorry, the \`${name}\` widget failed: ${(err as Error)?.message ?? err}`,
        );
      }
    });
  }
}
