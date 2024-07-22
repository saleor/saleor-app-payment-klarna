import { saleorApp } from "../../saleor-app";
import { env } from "@/lib/env.mjs";

export const getAuthData = async () => {
  const { apl } = saleorApp;
  const authData = await apl.get(env.SALEOR_API_URL as string);

  return authData;
};
