export enum ComponentName {
  Persona = "graph.microsoft.com/user",
  PersonaSet = "graph.microsoft.com/users",
}

export enum ComponentViewType {
  Compact = "compact",
}

export type IComponentUser = {
  id: string;
  userPrincipalName: string;
  displayName?: string;
};

export type IComponentProperties = {
  displayName?: IComponentUser["displayName"];
  userPrincipalName?: IComponentUser["userPrincipalName"];
  users?: IComponentUser[];
};

export type IComponentPayload = {
  type: "Component";
  name: ComponentName;
  view?: ComponentViewType[];
  properties?: IComponentProperties;
};

export const createAdaptiveCardPersona = (
  user: IComponentUser
): IComponentPayload => ({
  type: "Component",
  name: ComponentName.Persona,
  properties: {
    ...user,
  },
});

export const createAdaptiveCardPersonaSet = (
  users: IComponentUser[]
): IComponentPayload => ({
  type: "Component",
  name: ComponentName.PersonaSet,
  properties: {
    users,
  },
});
