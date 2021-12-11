import {
  ConversationReference,
  MessagingExtensionResult,
} from "botframework-schema";
import {
  AzureTable,
  deflattenObj,
  flattenObj,
  TableEntity,
} from "./azure-storage";

export interface UserData {
  convRefOneOnOne?: Partial<ConversationReference>;
  meQueryOverwrite?: MessagingExtensionResult;
  tags?: string[];
}

export class UserDataTable extends AzureTable<TableEntity<UserData>> {
  private readonly partitionKey = "user-data";

  constructor(private userId: string) {
    super("userData");
  }

  public update(obj: Partial<UserData>) {
    const data = flattenObj(obj);
    return super.put({
      PartitionKey: this.partitionKey,
      RowKey: this.userId,
      ...data,
    });
  }

  public async get<K extends keyof UserData>(
    ...proj: K[]
  ): Promise<{ [R in K]: UserData[R] } | undefined> {
    const entries = await super.query(
      {
        PartitionKey: this.partitionKey,
        RowKey: this.userId,
      },
      proj
    );
    return deflattenObj(entries?.[0]) ?? undefined;
  }
}
