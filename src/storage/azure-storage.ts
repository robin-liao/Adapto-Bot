import {
  createTableService,
  TableService,
  TableUtilities,
  TableQuery,
} from "azure-storage";
import config from "../config";
import * as _ from "lodash";

const entGen = TableUtilities.entityGenerator;

export type ValueType = string | number | boolean | Date;

export interface AzureTableEntity {
  PartitionKey: string;
  RowKey: string;
  Timestamp?: Date;
}

export type AzureTableEntityRaw<E extends AzureTableEntity> = {
  [K in keyof E]: TableUtilities.entityGenerator.EntityProperty<E[K]>;
};

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

class AzureTableService {
  private service = createTableService(config.azureStorageConnectionString);

  public getTable(tblName: string): Promise<TableService.TableResult> {
    return new Promise((resolve, reject) => {
      this.service.createTableIfNotExists(
        tblName,
        {},
        (err, result, response) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        }
      );
    });
  }

  public putEntity<E extends AzureTableEntity>(
    tblName: string,
    entity: Partial<E>
  ): Promise<TableService.EntityMetadata> {
    return new Promise((resolve, reject) => {
      this.service.insertOrMergeEntity<AzureTableEntityRaw<E>>(
        tblName,
        this.toStorageEntity(entity),
        (err, result, response) => {
          if (!err) {
            resolve(result);
          } else {
            reject(err);
          }
        }
      );
    });
  }

  public queryEntities<E extends AzureTableEntity>(
    tblName: string,
    entity: Partial<E>,
    proj?: (keyof E)[]
  ): Promise<E[]> {
    const keys = _.keys(entity);
    let query = new TableQuery();
    keys.forEach((k, id) => {
      if (id === 0) {
        query = query.where(`${k} eq ?`, entity[k]);
      } else {
        query = query.and(`${k} eq ?`, entity[k]);
      }
    });

    if (!_.isEmpty(proj)) {
      query = query.select(proj as string[]);
    }

    return new Promise<E[]>((resolve, reject) => {
      this.service.queryEntities<AzureTableEntityRaw<E>>(
        tblName,
        query,
        null,
        (err, result, response) => {
          if (!err) {
            const arr = _.map(result.entries, (entry) =>
              _.mapValues(entry, (v) =>
                v.$ === "Edm.DateTime"
                  ? new Date(v._ as unknown as string)
                  : v._
              )
            ) as E[];
            resolve(arr);
          } else {
            reject(err);
          }
        }
      );
    });
  }

  public deleteEntity(
    tblName: string,
    entity: AzureTableEntity
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.service.deleteEntity(tblName, entity, (error, response) =>
        error ? reject(error) : resolve()
      );
    });
  }

  private toStorageEntity<E extends AzureTableEntity>(
    entity: Partial<E>
  ): AzureTableEntityRaw<E> {
    return _.mapValues(entity, (val) =>
      _.isString(val)
        ? entGen.String(val)
        : _.isBoolean(val)
        ? entGen.Boolean(val)
        : _.isNumber(val)
        ? entGen.Double(val)
        : _.isDate(val)
        ? entGen.DateTime(val)
        : entGen.String(val.toString())
    ) as any;
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
