import { env } from "@/lib/env.mjs";
import { RedisAbstract } from "@/lib/redis/RedisAbstract";

export class RedisAplInstance extends RedisAbstract {
  private static instance: RedisAplInstance | undefined;

  constructor() {
    super(env.APL_REDIS_HOST, Number(env.APL_REDIS_PORT), Number(env.APL_REDIS_DB));
  }
  public static getInstance(): RedisAplInstance {
    if (!RedisAplInstance.instance) {
      RedisAplInstance.instance = new RedisAplInstance();
    }

    return RedisAplInstance.instance;
  }
}
