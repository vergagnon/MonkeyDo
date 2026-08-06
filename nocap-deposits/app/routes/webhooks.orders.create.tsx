import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Records orders paid with a deposit so the dashboard can track outstanding
// balances. An order placed through a deposit selling plan arrives with
// payment terms and a non-zero outstanding total.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  const totalPrice = Number(payload.total_price ?? 0);
  const totalOutstanding = Number(payload.total_outstanding ?? 0);
  const hasPaymentTerms = Boolean(payload.payment_terms);

  if (totalOutstanding > 0 && hasPaymentTerms) {
    const schedules = payload.payment_terms?.payment_schedules ?? [];
    const dueAt = schedules
      .map((s: { due_at?: string; completed_at?: string }) =>
        s.completed_at ? null : s.due_at,
      )
      .filter(Boolean)
      .sort()[0];

    await db.depositOrder.upsert({
      where: { orderId: String(payload.id) },
      update: {
        balanceAmount: totalOutstanding,
        balanceDueAt: dueAt ? new Date(dueAt) : null,
      },
      create: {
        shop,
        orderId: String(payload.id),
        orderName: String(payload.name ?? payload.id),
        customerEmail: payload.email ?? null,
        currency: String(payload.currency ?? "USD"),
        totalAmount: totalPrice,
        depositAmount: totalPrice - totalOutstanding,
        balanceAmount: totalOutstanding,
        balanceDueAt: dueAt ? new Date(dueAt) : null,
        status: "BALANCE_DUE",
      },
    });
  }

  return new Response();
};
