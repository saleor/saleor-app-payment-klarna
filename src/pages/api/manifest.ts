import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { paymentGatewayInitializeSessionSyncWebhook } from "./webhooks/saleor/payment-gateway-initialize-session";
import { transactionInitializeSessionSyncWebhook } from "./webhooks/saleor/transaction-initialize-session";
import { transactionProcessSessionSyncWebhook } from "./webhooks/saleor/transaction-process-session";

export default createManifestHandler({
  async manifestFactory(context) {
    const manifest: AppManifest = {
      id: "app.saleor.klarna",
      name: "Klarna",
      about: packageJson.description,
      tokenTargetUrl: `${context.appBaseUrl}/api/register`,
      appUrl: context.appBaseUrl,
      permissions: ["HANDLE_PAYMENTS"],
      version: packageJson.version,
      requiredSaleorVersion: ">=3.15.0",
      homepageUrl: "https://docs.saleor.io/docs/3.x/developer/app-store/apps/klarna",
      supportUrl: "https://github.com/saleor/saleor-app-payment-klarna/issues",
      brand: {
        logo: {
          default: `${context.appBaseUrl}/logo.png`,
        },
      },
      webhooks: [
        paymentGatewayInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionProcessSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
      ],
      extensions: [],
    };

    return manifest;
  },
});
