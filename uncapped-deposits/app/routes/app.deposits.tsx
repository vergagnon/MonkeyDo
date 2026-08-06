import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  createDepositPlan,
  deleteDepositPlan,
  listDepositPlans,
  type BalanceDueMode,
} from "../services/deposit-plans.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const plans = await listDepositPlans(admin);
  return { plans };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "delete") {
    const result = await deleteDepositPlan(admin, String(form.get("id")));
    return { ok: !result.errors, errors: result.errors };
  }

  if (intent === "create") {
    const productIds = String(form.get("productIds") ?? "")
      .split(",")
      .filter(Boolean);
    const result = await createDepositPlan(admin, {
      name: String(form.get("name")),
      depositPercentage: Number(form.get("depositPercentage")),
      balanceDueMode: String(form.get("balanceDueMode")) as BalanceDueMode,
      balanceDueDaysAfterCheckout: Number(form.get("balanceDueDays") || 30),
      balanceDueExactTime: String(form.get("balanceDueExactTime") || "") || undefined,
      productIds,
    });
    return { ok: !result.errors, errors: result.errors, id: result.id };
  }

  return { ok: false, errors: ["Unknown action"] };
};

function describeBalance(plan: {
  remainingBalanceChargeTrigger: string | null;
  remainingBalanceChargeExactTime: string | null;
  remainingBalanceChargeTimeAfterCheckout: string | null;
}) {
  switch (plan.remainingBalanceChargeTrigger) {
    case "NO_REMAINING_BALANCE":
      return "No balance due";
    case "EXACT_TIME":
      return `Balance due ${plan.remainingBalanceChargeExactTime?.slice(0, 10) ?? ""}`;
    case "TIME_AFTER_CHECKOUT": {
      const days = plan.remainingBalanceChargeTimeAfterCheckout?.replace(/\D/g, "");
      return `Balance due ${days ?? "?"} days after checkout`;
    }
    default:
      return "—";
  }
}

export default function DepositPlansPage() {
  const { plans } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [name, setName] = useState("Deposit");
  const [percentage, setPercentage] = useState("50");
  const [mode, setMode] = useState<BalanceDueMode>("TIME_AFTER_CHECKOUT");
  const [days, setDays] = useState("30");
  const [exactTime, setExactTime] = useState("");
  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);

  const submitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "ok" in fetcher.data) {
      if (fetcher.data.ok) {
        shopify.toast.show("Deposit plan saved");
        setProducts([]);
      } else if (fetcher.data.errors?.length) {
        shopify.toast.show(fetcher.data.errors.join(", "), { isError: true });
      }
    }
  }, [fetcher.data, shopify]);

  const pickProducts = async () => {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
    });
    if (selection) {
      setProducts(selection.map((p: any) => ({ id: p.id, title: p.title })));
    }
  };

  const createPlan = () => {
    fetcher.submit(
      {
        intent: "create",
        name,
        depositPercentage: percentage,
        balanceDueMode: mode,
        balanceDueDays: days,
        balanceDueExactTime: exactTime,
        productIds: products.map((p) => p.id).join(","),
      },
      { method: "POST" },
    );
  };

  return (
    <Page title="Deposit plans">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                New deposit plan
              </Text>
              <TextField
                label="Plan name (shown at checkout)"
                value={name}
                onChange={setName}
                autoComplete="off"
                helpText='Example: "50% deposit — balance due before delivery"'
              />
              <InlineStack gap="400" wrap={false}>
                <TextField
                  label="Deposit percentage"
                  type="number"
                  value={percentage}
                  onChange={setPercentage}
                  suffix="%"
                  min={1}
                  max={99}
                  autoComplete="off"
                />
                <Select
                  label="Remaining balance"
                  options={[
                    { label: "Due X days after checkout", value: "TIME_AFTER_CHECKOUT" },
                    { label: "Due on a specific date", value: "EXACT_TIME" },
                    { label: "No remaining balance", value: "NO_REMAINING_BALANCE" },
                  ]}
                  value={mode}
                  onChange={(value) => setMode(value as BalanceDueMode)}
                />
                {mode === "TIME_AFTER_CHECKOUT" && (
                  <TextField
                    label="Days after checkout"
                    type="number"
                    value={days}
                    onChange={setDays}
                    min={1}
                    autoComplete="off"
                  />
                )}
                {mode === "EXACT_TIME" && (
                  <TextField
                    label="Balance due date"
                    type="date"
                    value={exactTime}
                    onChange={setExactTime}
                    autoComplete="off"
                  />
                )}
              </InlineStack>
              <InlineStack gap="300" blockAlign="center">
                <Button onClick={pickProducts}>
                  {products.length
                    ? `${products.length} product${products.length > 1 ? "s" : ""} selected`
                    : "Select products"}
                </Button>
                <Button
                  variant="primary"
                  onClick={createPlan}
                  loading={submitting}
                  disabled={!name || !products.length}
                >
                  Create deposit plan
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            {plans.length === 0 ? (
              <EmptyState
                heading="No deposit plans yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Create your first plan above — it takes under a minute.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "plan", plural: "plans" }}
                itemCount={plans.length}
                selectable={false}
                headings={[
                  { title: "Plan" },
                  { title: "Deposit" },
                  { title: "Balance" },
                  { title: "Products" },
                  { title: "" },
                ]}
              >
                {plans.map((plan, index) => (
                  <IndexTable.Row id={plan.id} key={plan.id} position={index}>
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="semibold">
                        {plan.name}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {plan.depositPercentage !== null ? (
                        <Badge tone="success">{`${plan.depositPercentage}%`}</Badge>
                      ) : (
                        "—"
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>{describeBalance(plan)}</IndexTable.Cell>
                    <IndexTable.Cell>{plan.productsCount}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <Button
                        tone="critical"
                        variant="tertiary"
                        loading={submitting}
                        onClick={() =>
                          fetcher.submit({ intent: "delete", id: plan.id }, { method: "POST" })
                        }
                      >
                        Delete
                      </Button>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
