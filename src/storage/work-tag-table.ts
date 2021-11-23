import _ from "lodash";
import {
  AzureTable,
  deflattenObj,
  flattenObj,
  TableEntity,
} from "./azure-storage";

export interface WorkTagUserData {
  tag: string;
  note?: string;
  convLinks?: string[];
}

export interface WorkTag extends WorkTagUserData {
  id: string;
  userId: string;
}

export class WorkTagTable extends AzureTable<TableEntity<WorkTag>> {
  private readonly partitionKey = "work-tag";

  constructor(private userId: string) {
    super("workTag");
  }

  public update(tagId: string, obj: Partial<WorkTagUserData>) {
    const data = flattenObj(obj);
    return super.put({
      PartitionKey: this.partitionKey,
      RowKey: tagId,
      userId: this.userId,
      ...data,
    });
  }

  public delete(tagId: string) {
    return super.del({
      PartitionKey: this.partitionKey,
      RowKey: tagId,
    });
  }

  public async get<K extends keyof WorkTag>(
    tag: string,
    ...proj: K[]
  ): Promise<{ [R in K]: WorkTag[R] } | undefined> {
    const queryId = proj.includes("id" as K);
    const entries = await super.query(
      {
        PartitionKey: this.partitionKey,
        userId: this.userId,
        tag,
      },
      queryId ? [...proj, "RowKey"] : undefined
    );
    const obj = entries?.[0];
    if (obj) {
      const rtn = deflattenObj(obj);
      if (queryId) {
        rtn.id = obj.RowKey;
      }
      return rtn;
    }
  }

  public async getAll<K extends keyof WorkTag>(
    ...proj: K[]
  ): Promise<{ [R in K]: WorkTag[R] }[] | undefined> {
    const queryId = proj.includes("id" as K);
    const entries = await super.query(
      {
        PartitionKey: this.partitionKey,
        userId: this.userId,
      },
      queryId ? [...proj, "RowKey"] : undefined
    );
    if (!_.isEmpty(entries)) {
      const tags = entries.map((obj) => {
        const rtn = deflattenObj(obj);
        if (queryId) {
          rtn.id = obj.RowKey;
        }
        return rtn;
      });
      return tags;
    }
    return [];
  }
}
