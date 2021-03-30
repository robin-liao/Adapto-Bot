import {
  CardFactory,
  TaskModuleResponse,
  MessagingExtensionActionResponse,
} from "botbuilder";

export const respondTaskModuleError = (
  message: string,
  showCancelButton?: boolean,
  showJITButton?: boolean
): TaskModuleResponse | MessagingExtensionActionResponse => ({
  task: {
    type: "continue",
    value: {
      title: "Error",
      card: CardFactory.adaptiveCard({
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.3",
        body: [
          {
            type: "TextBlock",
            text: message,
            color: "attention",
          },
        ],
        actions: [
          ...(showJITButton && [
            {
              type: "Action.Submit",
              title: "Install App",
              data: {
                msteams: {
                  justInTimeInstall: true,
                },
              },
            },
          ]),
          ...(showCancelButton && [
            {
              type: "Action.Submit",
              title: "Close",
            },
          ]),
        ],
      }),
    },
  },
});
