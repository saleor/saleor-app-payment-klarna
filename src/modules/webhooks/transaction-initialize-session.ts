import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import {
  TransactionFlowStrategyEnum,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { getConfigurationForChannel } from "@/modules/payment-app-configuration/payment-app-configuration";
import { getWebhookPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { paymentAppFullyConfiguredEntrySchema } from "@/modules/payment-app-configuration/config-entry";
import {
  getLineItems,
  getKlarnaApiClient,
  type KlarnaMetadata,
  prepareRequestAddress,
} from "@/modules/klarna/klarna-api";
import { type components } from "generated/klarna";
import { obfuscateConfig } from "@/modules/app-configuration/utils";
import { type JSONObject } from "@/types";
import { KlarnaHttpClientError } from "@/errors";
import { getKlarnaIntegerAmountFromSaleor } from "@/modules/klarna/currencies";
import { getNormalizedLocale } from "@/backend-lib/api-route-utils";
import { env } from "@/lib/env.mjs";

export const TransactionInitializeSessionWebhookHandler = async (
  event: TransactionInitializeSessionEventFragment,
  { saleorApiUrl, baseUrl }: { saleorApiUrl: string; baseUrl: string },
): Promise<TransactionInitializeSessionResponse> => {
  const appBaseUrl = env.APP_API_BASE_URL ?? baseUrl;

  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionInitializeSessionWebhookHandler] " },
  );
  const { transaction, action, sourceObject, merchantReference, issuingPrincipal } = event;
  const { id, __typename, channel } = sourceObject;
  const logData = {
    transaction,
    action,
    sourceObject: { id, channel, __typename },
    merchantReference,
    issuingPrincipal,
  };
  logger.debug(logData, "Received event");

  const app = event.recipient;
  invariant(app, "Missing event.recipient!");
  invariant(event.data, "Missing data");

  const { privateMetadata } = app;

  const configurator = getWebhookPaymentAppConfigurator({ privateMetadata }, saleorApiUrl);
  const appConfig = await configurator.getConfig();
  const klarnaConfig = paymentAppFullyConfiguredEntrySchema.parse(
    getConfigurationForChannel(appConfig, event.sourceObject.channel.id),
  );

  const klarnaClient = getKlarnaApiClient({
    klarnaApiUrl: klarnaConfig.apiUrl,
    username: klarnaConfig.username,
    password: klarnaConfig.password,
  });

  const createKlarnaSession = klarnaClient.path("/payments/v1/sessions").method("post").create();

  const locale = getNormalizedLocale(event);

  const country = event.sourceObject.billingAddress?.country.code;
  invariant(country, "Missing country code");

  const transactionId = event.transaction.id;
  const channelId = event.sourceObject.channel.id;

  const metadata: KlarnaMetadata = {
    transactionId,
    channelId,
    ...(event.sourceObject.__typename === "Checkout" && { checkoutId: event.sourceObject.id }),
    ...(event.sourceObject.__typename === "Order" && { orderId: event.sourceObject.id }),
  };

  const orderLines = getLineItems(event.sourceObject);
  const orderTaxAmount = orderLines.reduce((acc, line) => acc + (line.total_tax_amount ?? 0), 0);

  const authorizationCallbackUrl = new URL(appBaseUrl);
  authorizationCallbackUrl.pathname = "/api/webhooks/klarna/authorization";
  authorizationCallbackUrl.searchParams.set("transactionId", transactionId);
  authorizationCallbackUrl.searchParams.set("channelId", channelId);
  authorizationCallbackUrl.searchParams.set("saleorApiUrl", saleorApiUrl);

  const email = sourceObject.userEmail;
  const createKlarnaSessionPayload: components["schemas"]["session_create"] = {
    locale: locale.split("_")[0],
    purchase_country: country,
    purchase_currency: event.action.currency,
    billing_address: prepareRequestAddress(sourceObject.billingAddress, email),
    shipping_address: prepareRequestAddress(sourceObject.shippingAddress, email),
    order_amount: getKlarnaIntegerAmountFromSaleor(event.action.amount, event.action.currency),
    order_tax_amount: orderTaxAmount,
    order_lines: orderLines,
    intent: "buy",
    merchant_reference1: event.transaction.id,
    merchant_reference2: event.sourceObject.id,
    merchant_data: JSON.stringify(metadata),
    merchant_urls: {
      authorization: authorizationCallbackUrl.toString(),
    },
  };
  logger.info(authorizationCallbackUrl.toString());
  logger.debug({ ...obfuscateConfig(createKlarnaSessionPayload) }, "createKlarnaSession payload");

  const klarnaSession = await createKlarnaSession(createKlarnaSessionPayload);
  logger.debug({ ...obfuscateConfig(klarnaSession) }, "createKlarnaSession result");

  if (!klarnaSession.ok) {
    throw new KlarnaHttpClientError(klarnaSession.statusText, { errors: [klarnaSession.data] });
  }

  const transactionInitializeSessionResponse: TransactionInitializeSessionResponse = {
    data: {
      klarnaSessionResponse: klarnaSession.data as JSONObject,
    },
    pspReference: klarnaSession.data.session_id,
    result:
      event.action.actionType === TransactionFlowStrategyEnum.Authorization
        ? "AUTHORIZATION_ACTION_REQUIRED"
        : "CHARGE_ACTION_REQUIRED",
    actions: [],
    amount: action.amount,
    message: "",
    externalUrl: undefined, // @todo,
  };
  return transactionInitializeSessionResponse;
};
