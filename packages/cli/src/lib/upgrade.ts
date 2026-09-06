import open from "open";
import { getErrorResponse } from "./http-errors";
import { client } from "./api-client";

export async function openUpgradeCheckout() {
  const response = await client.billing.checkout.$post();

  if (response.ok) {
    const data = await response.json();
    await open(data.url);
    return;
  }

  throw new Error(await getErrorResponse(response));
};

export async function openBillingPortal() {
  const response = await client.billing.portal.$post();

  if (response.ok) {
    const data = await response.json();
    await open(data.url);
    return;
  }

  throw new Error(await getErrorResponse(response));
};