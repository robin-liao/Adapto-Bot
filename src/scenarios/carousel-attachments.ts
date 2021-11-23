export const attachments = [
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element AMS_IRD02 [url text](https://google.com)",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Active. [url text](https://google.com)",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Major",
            },
            {
              title: "Alarms:",
              value: "1",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/1",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "1",
            DataMinerId: "3",
            ElementName: "AMS_IRD02",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control [url text](https://google.com)",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused. [url text](https://google.com)",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "2",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/2",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "2",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "3",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/3",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "3",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "4",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/4",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "4",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "5",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/5",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "5",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "6",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/6",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "6",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "7",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/7",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "7",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "8",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/8",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "8",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "9",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/9",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "9",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
  {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          size: "Medium",
          weight: "Bolder",
          text: "Element TOR-6 Uplink Power Control",
        },
        {
          type: "TextBlock",
          spacing: "None",
          text: "The element is Paused.",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "FactSet",
          facts: [
            {
              title: "Alarm Level:",
              value: "Normal",
            },
            {
              title: "Alarms:",
              value: "10",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "Open",
          url: "https://escape-bot.local.dataminer.services:3001/monitoring/element/3/10",
        },
        {
          type: "Action.Submit",
          title: "Alarms",
          data: {
            CustomActionId: "GetAlarmsForElementId",
            ElementId: "10",
            DataMinerId: "3",
            ElementName: "TOR-6 Uplink Power Control",
          },
        },
      ],
      msteams: {
        width: "Full",
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.2",
    },
  },
];
