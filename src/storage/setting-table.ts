import { printableJson } from "../utils";
import { AzureTableEntity, AzureTable } from "./azure-storage";

export interface ConvSetting {
  echoAllTeamsEvents?: boolean;
  echoMessage?: boolean;
  echoMessageReaction?: boolean;
}

type ConvSettingTableEntity = ConvSetting & AzureTableEntity;

export class ConvSettingTable extends AzureTable<ConvSettingTableEntity> {
  private readonly settingKey = "conversation-setting";

  constructor(private convId: string) {
    super("settings");
  }

  public update(setting: Partial<ConvSettingTableEntity>) {
    return super.put({
      PartitionKey: this.settingKey,
      RowKey: this.convId,
      ...setting,
    });
  }

  public async get(
    ...proj: (keyof ConvSettingTableEntity)[]
  ): Promise<ConvSettingTableEntity | undefined> {
    const entries = await super.query(
      {
        PartitionKey: this.settingKey,
        RowKey: this.convId,
      },
      proj
    );
    return entries[0] ?? undefined;
  }
}

if (require.main === module) {
  (async () => {
    const tbl = new ConvSettingTable("conv-1234");
    await tbl.update({ echoAllTeamsEvents: false });
    const res = await tbl.get("RowKey", "echoAllTeamsEvents");
    console.log(printableJson(res));
  })();
}
