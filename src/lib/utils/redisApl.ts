import type { APL, AplConfiguredResult, AplReadyResult, AuthData } from "@saleor/app-sdk/APL";
import { RedisAplInstance } from "@/lib/redis/RedisAPL";
import { env } from "@/lib/env.mjs";
import { logger } from "@/lib/logger";

const prepareAuthDataKey = (apiUrl: string) => `${env.APL_REDIS_APP_ID}:${apiUrl}`;

export class RedisAPL implements APL {
  private client = RedisAplInstance.getInstance().getClient();

  async get(saleorApiUrl: string): Promise<AuthData | undefined> {
    const response = await this.client.get(prepareAuthDataKey(saleorApiUrl));

    if (response) {
      return JSON.parse(response) as AuthData;
    }
  }

  async getAll(): Promise<AuthData[]> {
    throw new Error("RedisAPL does not support getAll method.");
  }

  async set(authData: AuthData) {
    try {
      await this.client.set(prepareAuthDataKey(authData.saleorApiUrl), JSON.stringify(authData));
    } catch (error) {
      logger.error("Error in setting auth data into redis.", error);
    }
  }

  async delete(saleorApiUrl: string) {
    try {
      await this.client.del(prepareAuthDataKey(saleorApiUrl));
    } catch (error) {
      logger.error("Error in deleting auth data from redis.", error);
    }
  }

  async isConfigured(): Promise<AplConfiguredResult> {
    if (!env.APL_REDIS_APP_ID) {
      logger.warn("'APL_REDIS_APP_ID' env is missing.");
      return {
        configured: false,
        error: new Error("APL_REDIS_APP_ID env variable is missing."),
      };
    }
    if (!env.APL_REDIS_HOST) {
      logger.warn("'APL_REDIS_HOST' env is missing.");
      return {
        configured: false,
        error: new Error("APL_REDIS_HOST env variable is missing."),
      };
    }
    if (!env.APL_REDIS_PORT) {
      logger.warn("'APL_REDIS_PORT' env is missing.");
      return {
        configured: false,
        error: new Error("APL_REDIS_PORT env variable is missing."),
      };
    }

    return {
      configured: true,
    };
  }

  async isReady(): Promise<AplReadyResult> {
    const apl = new RedisAPL();

    const configured = await apl.isConfigured();

    if (!configured) {
      return {
        ready: false,
        error: new Error("RedisAPL is not configured properly."),
      };
    }

    return {
      ready: true,
    };
  }
}
