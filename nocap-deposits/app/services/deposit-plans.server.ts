import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export type BalanceDueMode = "TIME_AFTER_CHECKOUT" | "EXACT_TIME" | "NO_REMAINING_BALANCE";

export interface CreateDepositPlanInput {
  name: string;
  depositPercentage: number;
  balanceDueMode: BalanceDueMode;
  balanceDueDaysAfterCheckout?: number;
  balanceDueExactTime?: string; // ISO date
  productIds: string[];
}

export interface DepositPlanGroup {
  id: string;
  name: string;
  summary: string | null;
  productsCount: number;
  depositPercentage: number | null;
  remainingBalanceChargeTrigger: string | null;
  remainingBalanceChargeExactTime: string | null;
  remainingBalanceChargeTimeAfterCheckout: string | null;
}

const DEPOSIT_PLAN_FIELDS = `#graphql
  fragment DepositPlanGroupFields on SellingPlanGroup {
    id
    name
    summary
    productsCount {
      count
    }
    sellingPlans(first: 1) {
      edges {
        node {
          id
          name
          billingPolicy {
            ... on SellingPlanFixedBillingPolicy {
              checkoutCharge {
                chargeType: type
                value {
                  ... on SellingPlanCheckoutChargePercentageValue {
                    percentage
                  }
                }
              }
              remainingBalanceChargeTrigger
              remainingBalanceChargeExactTime
              remainingBalanceChargeTimeAfterCheckout
            }
          }
        }
      }
    }
  }
`;

export async function createDepositPlan(
  admin: AdminApiContext,
  input: CreateDepositPlanInput,
): Promise<{ id?: string; errors?: string[] }> {
  const { name, depositPercentage, balanceDueMode, productIds } = input;

  const billingPolicy: Record<string, unknown> = {
    checkoutCharge: {
      type: "PERCENTAGE",
      value: { percentage: depositPercentage },
    },
    remainingBalanceChargeTrigger: balanceDueMode,
  };

  if (balanceDueMode === "TIME_AFTER_CHECKOUT") {
    billingPolicy.remainingBalanceChargeTimeAfterCheckout = `P${input.balanceDueDaysAfterCheckout ?? 30}D`;
  } else if (balanceDueMode === "EXACT_TIME") {
    billingPolicy.remainingBalanceChargeExactTime = input.balanceDueExactTime;
  }

  const response = await admin.graphql(
    `#graphql
      mutation createDepositPlan($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput!) {
        sellingPlanGroupCreate(input: $input, resources: $resources) {
          sellingPlanGroup {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: {
          name,
          merchantCode: "nocap-deposit",
          options: ["Deposit"],
          position: 1,
          sellingPlansToCreate: [
            {
              name,
              options: `${depositPercentage}% deposit`,
              category: "PRE_ORDER",
              billingPolicy: { fixed: billingPolicy },
              deliveryPolicy: { fixed: { fulfillmentTrigger: "UNKNOWN" } },
              inventoryPolicy: { reserve: "ON_FULFILLMENT" },
            },
          ],
        },
        resources: { productIds, productVariantIds: [] },
      },
    },
  );

  const json = await response.json();
  const result = json.data?.sellingPlanGroupCreate;
  if (result?.userErrors?.length) {
    return { errors: result.userErrors.map((e: { message: string }) => e.message) };
  }
  return { id: result?.sellingPlanGroup?.id };
}

export async function listDepositPlans(admin: AdminApiContext): Promise<DepositPlanGroup[]> {
  const response = await admin.graphql(
    `#graphql
      ${DEPOSIT_PLAN_FIELDS}
      query listDepositPlans {
        sellingPlanGroups(first: 50) {
          edges {
            node {
              ...DepositPlanGroupFields
            }
          }
        }
      }
    `,
  );

  const json = await response.json();
  const edges = json.data?.sellingPlanGroups?.edges ?? [];

  return edges.map(({ node }: { node: any }) => {
    const plan = node.sellingPlans?.edges?.[0]?.node;
    const billing = plan?.billingPolicy ?? {};
    return {
      id: node.id,
      name: node.name,
      summary: node.summary ?? null,
      productsCount: node.productsCount?.count ?? 0,
      depositPercentage: billing.checkoutCharge?.value?.percentage ?? null,
      remainingBalanceChargeTrigger: billing.remainingBalanceChargeTrigger ?? null,
      remainingBalanceChargeExactTime: billing.remainingBalanceChargeExactTime ?? null,
      remainingBalanceChargeTimeAfterCheckout:
        billing.remainingBalanceChargeTimeAfterCheckout ?? null,
    };
  });
}

export async function deleteDepositPlan(
  admin: AdminApiContext,
  id: string,
): Promise<{ errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation deleteDepositPlan($id: ID!) {
        sellingPlanGroupDelete(id: $id) {
          deletedSellingPlanGroupId
          userErrors {
            field
            message
          }
        }
      }
    `,
    { variables: { id } },
  );

  const json = await response.json();
  const errors = json.data?.sellingPlanGroupDelete?.userErrors ?? [];
  if (errors.length) {
    return { errors: errors.map((e: { message: string }) => e.message) };
  }
  return {};
}
