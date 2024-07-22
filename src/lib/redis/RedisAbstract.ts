import Redis from "ioredis";
import { logger } from "@/lib/logger";

export abstract class RedisAbstract {
  protected client: Redis;
  constructor(
    host: string | undefined,
    port: number | undefined = 6379,
    db: number | undefined = 0,
  ) {
    this.client = new Redis({
      host: host,
      port: port,
      db: db,
      connectTimeout: 1000,
      retryStrategy: (times: number) => {
        logger.info("Retrying to reconnect with redis...");

        return Math.min(times * 50, 2000);
      },
    });
    this.client.on("connect", () => logger.info("Redis client connected."));
    this.client.on("ready", () => logger.info("Redis client is ready to use."));
    this.client.on("error", (err: Error) =>
      logger.fatal(`Redis connection error: ${JSON.stringify(err)}`),
    );
  }

  public getClient(): Redis {
    return this.client;
  }
}
