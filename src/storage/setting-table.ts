export interface ConvSetting {
  echoAllTeamsEvents?: boolean;
  echoMessage?: boolean;
  echoMessageReaction?: boolean;
}

const settingsByConversation = new Map<string, ConvSetting>();

export class ConvSettingStore {
  public static async get(convId: string): Promise<ConvSetting | undefined> {
    const setting = settingsByConversation.get(convId);
    return setting ? { ...setting } : undefined;
  }

  public static async update(
    convId: string,
    setting: Partial<ConvSetting>,
  ): Promise<void> {
    settingsByConversation.set(convId, {
      ...settingsByConversation.get(convId),
      ...setting,
    });
  }
}
