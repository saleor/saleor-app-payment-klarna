import type { NextApiRequest } from "next";
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { AuthData } from "@saleor/app-sdk/APL";
import type { Client } from "urql";
import { createServerClient } from "@/lib/create-graphq-client";
import { getAuthData } from "@/lib/utils/auth-data";

export interface ContextValue {
  dataSources: {
    client: Client;
  };
  token?: string;
  channel: string;
}

// Define type definitions (schema)
const typeDefs = `
  type Query {
    ping: String!
  }
`;

// Define resolvers
const resolvers = {
  Query: {
    ping: () => "pong",
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

export default startServerAndCreateNextHandler(server, {
  context: async (req: NextApiRequest): Promise<ContextValue> => {
    const authData = (await getAuthData()) as AuthData;

    const token = req.headers.authorization;
    const client = createServerClient(authData.saleorApiUrl, authData.token);

    return {
      token,
      channel: "default-channel",
      dataSources: {
        client,
      },
    };
  },
});
