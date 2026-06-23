import { TableClient, TableEntity as SdkTableEntity } from "@azure/data-tables";
import config from "../config";
import * as _ from "lodash";

export type ValueType = string | number | boolean | Date;

export interface AzureTableEntity {
  PartitionKey: string;
  RowKey: string;
  Timestamp?: Date;
}

export type Flatten<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends ValueType ? T[K] : string;
};

export type TableEntity<T extends Record<string, any>> = Flatten<T> &
  AzureTableEntity;

export const flattenObj = <T extends Record<string, any>>(obj: T): Flatten<T> =>
  _.transform(obj, (res: any, v, k) => {
    res[k] =
      _.isString(v) || _.isNumber(v) || _.isBoolean(v) || _.isDate(v)
        ? v
        : JSON.stringify(v);
  });

export const deflattenObj = <T extends Record<string, any>>(
  obj: TableEntity<T>
): T =>
  _.transform(obj, (res: any, v, k) => {
    try {
      res[k] = JSON.parse(v);
    } catch {
      res[k] = v;
    }
  });

const isValueType = (v: any): v is ValueType =>
  _.isString(v) || _.isNumber(v) || _.isBoolean(v) || _.isDate(v);

const odataLiteral = (v: ValueType): string => {
  if (_.isString(v)) return `'${v.replace(/'/g, "''")}'`;
  if (_.isDate(v)) return `datetime'${v.toISOString()}'`;
  return `${v}`; // number | boolean
};

class AzureTableService {
  private readonly connectionString = config.azureStorageConnectionString;
  private readonly clients = new Map<string, TableClient>();

  private client(tblName: string): TableClient {
    let c = this.clients.get(tblName);
    if (!c) {
      c = TableClient.fromConnectionString(this.connectionString, tblName, {
        allowInsecureConnection: true,
      });
      this.clients.set(tblName, c);
    }
    return c;
  }

  public async getTable(tblName: string): Promise<void> {
    try {
      await this.client(tblName).createTable();
    } catch (err: any) {
      // 409 TableAlreadyExists is expected and safe to ignore.
      if (err?.statusCode !== 409) {
        throw err;
      }
    }
  }

  public async putEntity<E extends AzureTableEntity>(
    tblName: string,
    entity: Partial<E>
  ): Promise<void> {
    const { PartitionKey, RowKey, Timestamp, ...rest } = entity as any;
    const sdkEntity: SdkTableEntity = {
      partitionKey: String(PartitionKey),
      rowKey: String(RowKey),
    };
    _.forEach(rest, (v, k) => {
      sdkEntity[k] = isValueType(v) ? v : JSON.stringify(v);
    });
    await this.client(tblName).upsertEntity(sdkEntity, "Merge");
  }

  public async queryEntities<E extends AzureTableEntity>(
    tblName: string,
    entity: Partial<E>,
    proj?: (keyof E)[]
  ): Promise<E[]> {
    const filter = _.keys(entity)
      .map((k) => `${k} eq ${odataLiteral((entity as any)[k])}`)
      .join(" and ");

    const iter = this.client(tblName).listEntities<SdkTableEntity>({
      queryOptions: {
        filter: filter || undefined,
        select: _.isEmpty(proj) ? undefined : (proj as string[]),
      },
    });

    const results: E[] = [];
    for await (const e of iter) {
      const { partitionKey, rowKey, timestamp, etag, ...restProps } = e as any;
      results.push({
        ...restProps,
        PartitionKey: partitionKey,
        RowKey: rowKey,
        Timestamp: timestamp ? new Date(timestamp) : undefined,
      } as unknown as E);
    }
    return results;
  }

  public async deleteEntity(
    tblName: string,
    entity: AzureTableEntity
  ): Promise<void> {
    await this.client(tblName).deleteEntity(
      entity.PartitionKey,
      entity.RowKey
    );
  }
}

export class AzureTable<
  E extends AzureTableEntity & Partial<Record<keyof E, ValueType>>
> {
  private init = AzureStorage.getTable(this.tableName);

  constructor(public readonly tableName: string) {}

  protected async put(obj: Partial<E>) {
    await this.init;
    return AzureStorage.putEntity(this.tableName, obj as any);
  }

  protected async query(obj: Partial<E>, proj?: (keyof E)[]) {
    await this.init;
    return AzureStorage.queryEntities(this.tableName, obj as any, proj);
  }

  protected async del(obj: AzureTableEntity) {
    await this.init;
    return AzureStorage.deleteEntity(this.tableName, obj);
  }
}

export const AzureStorage = new AzureTableService();
