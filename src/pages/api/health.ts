import { gql } from "urql";
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@/lib/create-graphq-client";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env.mjs";

enum HealthEnum {
  DOWN = "DOWN",
  UP = "UP",
}

enum HealthCodeEnum {
  UP = 200,
  DOWN = 503,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const query = gql`
    query test {
      __typename
    }
  `;

  try {
    const token = "";
    const client = createServerClient(env.SALEOR_API_URL as string, token);
    const graphqlRe = await client.query(query, {}).toPromise();

    if (!graphqlRe?.data) {
      logger.fatal(
        `Error performing Apollo Server health check, for url with path "/api/graphql": ${JSON.stringify(
          graphqlRe?.error,
        )}`,
      );
      return res.status(HealthCodeEnum.DOWN).json({
        status: HealthEnum.DOWN,
        message: "Error performing Apollo Server health check.",
      });
    }
  } catch (error) {
    logger.fatal(
      `Error performing Apollo Server health check, for url with path "/api/graphql": ${JSON.stringify(
        error,
      )}`,
    );

    return res.status(HealthCodeEnum.DOWN).json({
      status: HealthEnum.DOWN,
      message: "Error performing Apollo Server health check.",
    });
  }

  return res.status(HealthCodeEnum.UP).json({ status: HealthEnum.UP });
}
