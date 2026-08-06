import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Card,
  EmptyState,
  IndexTable,
  InlineGrid,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const orders = await db.depositOrder.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const outstanding = orders
    .filter((o) => o.status === "BALANCE_DUE")
    .reduce((sum, o) => sum + o.balanceAmount, 0);
  const collected = orders.reduce((sum, o) => sum + o.depositAmount, 0);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderName: o.orderName,
      customerEmail: o.customerEmail,
      currency: o.currency,
      totalAmount: o.totalAmount,
      depositAmount: o.depositAmount,
      balanceAmount: o.balanceAmount,
      balanceDueAt: o.balanceDueAt?.toISOString() ?? null,
      status: o.status,
    })),
    outstanding,
    collected,
  };
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount);
}

export default function Dashboard() {
  const { orders, outstanding, collected } = useLoaderData<typeof loader>();
  const currency = orders[0]?.currency ?? "CAD";

  return (
    <Page title="NoCap Deposits">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Deposits collected
                </Text>
                <Text as="p" variant="headingLg">
                  {money(collected, currency)}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Balances outstanding
                </Text>
                <Text as="p" variant="headingLg">
                  {money(outstanding, currency)}
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            {orders.length === 0 ? (
              <EmptyState
                heading="No deposit orders yet"
                action={{ content: "Create a deposit plan", url: "/app/deposits" }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Once a customer checks out with a deposit, the order and its
                  outstanding balance will appear here.
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "order", plural: "orders" }}
                itemCount={orders.length}
                selectable={false}
                headings={[
                  { title: "Order" },
                  { title: "Customer" },
                  { title: "Total" },
                  { title: "Deposit paid" },
                  { title: "Balance" },
                  { title: "Balance due" },
                  { title: "Status" },
                ]}
              >
                {orders.map((order, index) => (
                  <IndexTable.Row id={order.id} key={order.id} position={index}>
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="semibold">
                        {order.orderName}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{order.customerEmail ?? "—"}</IndexTable.Cell>
                    <IndexTable.Cell>{money(order.totalAmount, order.currency)}</IndexTable.Cell>
                    <IndexTable.Cell>{money(order.depositAmount, order.currency)}</IndexTable.Cell>
                    <IndexTable.Cell>{money(order.balanceAmount, order.currency)}</IndexTable.Cell>
                    <IndexTable.Cell>
                      {order.balanceDueAt ? order.balanceDueAt.slice(0, 10) : "—"}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {order.status === "BALANCE_DUE" ? (
                        <Badge tone="attention">Balance due</Badge>
                      ) : order.status === "PAID" ? (
                        <Badge tone="success">Paid</Badge>
                      ) : (
                        <Badge>Cancelled</Badge>
                      )}
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Getting started
              </Text>
              <Text as="p" tone="subdued">
                1. <Link to="/app/deposits">Create a deposit plan</Link> and assign it
                to your made-to-order products. 2. Customers see the deposit option at
                checkout and pay only the deposit up front. 3. Track outstanding
                balances here. Unlimited order value — no percentages, no caps, ever.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
