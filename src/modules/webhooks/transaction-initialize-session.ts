import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { getConfigurationForChannel } from "@/modules/payment-app-configuration/payment-app-configuration";
import { getWebhookPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { paymentAppFullyConfiguredEntrySchema } from "@/modules/payment-app-configuration/config-entry";
import { getLineItems, getKlarnaApiClient } from "@/modules/klarna/klarna-api";

export const TransactionInitializeSessionWebhookHandler = async (
  event: TransactionInitializeSessionEventFragment,
  saleorApiUrl: string,
): Promise<TransactionInitializeSessionResponse> => {
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
    klarnaApiUrl: "https://api.playground.klarna.com/",
    username: klarnaConfig.username,
    password: klarnaConfig.password,
  });

  const createKlarnaSession = klarnaClient.path("/payments/v1/sessions").method("post").create();

  const locale =
    event.sourceObject.__typename === "Checkout"
      ? event.sourceObject.languageCode
      : event.sourceObject.languageCodeEnum.toString();

  const country = event.sourceObject.billingAddress?.country.code;

  invariant(country, "Missing country code");

  await createKlarnaSession({
    locale,
    purchase_country: country,
    purchase_currency: event.action.currency,
    order_amount: event.action.amount,
    order_lines: getLineItems(event.sourceObject),
    intent: "buy",
  });

  const klarnaPaymentRequest = await transactionInitializeSessionEventToKlarna(
    event,
    klarnaConfig.merchantAccount,
  );
  // logger.debug(
  //   {
  //     klarnaPaymentRequest: {
  //       ...obfuscateConfig(klarnaPaymentRequest),
  //       merchantAccount: klarnaPaymentRequest.merchantAccount,
  //       amount: klarnaPaymentRequest.amount,
  //       paymentMethod: klarnaPaymentRequest.paymentMethod,
  //       reference: klarnaPaymentRequest.reference,
  //       channel: klarnaPaymentRequest.channel,
  //     },
  //     environment: klarnaConfig.environment,
  //   },
  //   "klarnaPaymentRequest payload",
  // );
  // const klarnaPaymentResponse = await initializeKlarnaPayment({
  //   klarnaPaymentRequest,
  //   apiKey: klarnaConfig.apiKey,
  //   environment: klarnaConfig.environment,
  //   prefixUrl: klarnaConfig.prefixUrl,
  // });
  // const { pspReference, resultCode, fraudResult, paymentMethod } = klarnaPaymentResponse;
  // logger.debug(
  //   { pspReference, resultCode, fraudResult, paymentMethod },
  //   "klarnaPaymentRequest result",
  // );

  // const result = klarnaResultCodeToTransactionResult(
  //   event.action.actionType,
  //   klarnaPaymentResponse,
  // );
  // logger.debug(result, "Klarna -> Transaction result");

  // const data = {
  //   paymentResponse: klarnaPaymentResponse as JSONObject,
  // };

  // const transactionInitializeSessionResponse: TransactionInitializeSessionResponse = {
  //   data,
  //   pspReference: klarnaPaymentResponse.pspReference,
  //   result,
  //   actions: klarnaResultCodeToActions(event.action.actionType, klarnaPaymentResponse),
  //   amount: klarnaPaymentResponse.amount
  //     ? getSaleorAmountFromKlarnaInteger(
  //         klarnaPaymentResponse.amount?.value,
  //         klarnaPaymentResponse.amount?.currency,
  //       )
  //     : // If Klarna didn't provide an amount, fallback to amount from the request
  //       action.amount,
  //   message: klarnaPaymentResponse.refusalReason,
  //   externalUrl: klarnaPaymentResponse.pspReference
  //     ? getKlarnaExternalUrlForPsp({
  //         environment: klarnaConfig.environment,
  //         pspReference: klarnaPaymentResponse.pspReference,
  //       })
  //     : undefined,
  // };

  return transactionInitializeSessionResponse;
};
