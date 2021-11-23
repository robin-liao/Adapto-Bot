import _ from "lodash";
import * as redis from "redis";
import config from "./config";

class RedisClient {
  private readonly client = redis.createClient({
    ...config.redis,
  });

  public putObj(key: string, value: object, expSeconds?: number) {
    return new Promise<void>((resolve, reject) => {
      expSeconds
        ? this.client.setex(
            key,
            expSeconds,
            JSON.stringify(value),
            (err, res) => (err ? reject(err) : resolve())
          )
        : this.client.set(key, JSON.stringify(value), (err, res) =>
            err ? reject(err) : resolve()
          );
    });
  }

  public getObj<T = any>(key: string): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
      this.client.get(key, (err, reply) =>
        err
          ? reject(err)
          : !_.isString(reply)
          ? resolve(undefined)
          : resolve(JSON.parse(reply))
      );
    });
  }

  public hashSet(key: string, hashKey: string, value: string) {
    return new Promise<void>((resolve, reject) => {
      this.client.hset(key, hashKey, value, (err, reply) =>
        err ? reject(err) : resolve()
      );
    });
  }

  public hashGet(key: string, hashKey: string) {
    return new Promise<string>((resolve, reject) => {
      this.client.hget(key, hashKey, (err, reply) =>
        err ? reject(err) : resolve(reply)
      );
    });
  }
}

export const redisClient = new RedisClient();

if (require.main === module) {
  (async () => {
    await redisClient.putObj("key", { key: 123 }, 50);
    const obj = await redisClient.getObj<{ key: number }>("key");
    console.log(obj);
  })();
}
