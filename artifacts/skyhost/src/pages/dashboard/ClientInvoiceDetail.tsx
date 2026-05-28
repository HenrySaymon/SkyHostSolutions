import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { getGetClientInvoiceQueryKey, useGetClientInvoice } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ArrowLeft, Download, CreditCard, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/api-data";
import { useCurrency } from "@/contexts/CurrencyContext";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-sdk";

function getInrAmount(amount: number, currency: string, rates: Record<string, number>) {
  if (currency === "INR") return Number(amount);
  if (currency === "EUR") {
    const eurRate = rates.EUR || 0.92;
    const inrRate = rates.INR || 83.5;
    return (Number(amount) / eurRate) * inrRate;
  }
  return Number(amount) * (rates.INR || 83.5);
}

function loadRazorpaySdk() {
  const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing && window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    if (!existing) document.body.appendChild(script);
  });
}

export default function ClientInvoiceDetail() {
  const { id } = useParams();
  const { data: invoice, isLoading } = useGetClientInvoice(Number(id));
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { rates } = useCurrency();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  const [upi, setUpi] = useState<{
    enabled: boolean;
    upiId: string;
    payeeName: string;
    instructions: string;
    qrImageUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!paymentOpen) return;
    fetchJson<NonNullable<typeof upi>>("/api/client/payments/upi/config")
      .then(setUpi)
      .catch(() => setUpi(null));
  }, [paymentOpen]);

  const handleRazorpayPayment = async () => {
    if (!invoice || invoice.status === "paid") return;

    setIsRazorpayLoading(true);
    setPaymentMessage("Opening Razorpay checkout...");

    try {
      const config = await fetchJson<{
        enabled: boolean;
        keyId?: string | null;
        accountName?: string;
        description?: string;
      }>("/api/client/payments/razorpay/config");

      if (!config.enabled || !config.keyId) {
        throw new Error("Razorpay is not configured yet. Please contact support.");
      }

      const order = await fetchJson<{ razorpayOrderId: string; amount: number; currency: string }>(
        `/api/client/invoices/${invoice.id}/razorpay/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      await loadRazorpaySdk();
      if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable");

      const checkout = new window.Razorpay({
        key: config.keyId,
        amount: order.amount,
        currency: order.currency,
        name: config.accountName || "SkyHostSolutions",
        description: config.description || `Invoice ${invoiceNumber}`,
        order_id: order.razorpayOrderId,
        handler: async (response) => {
          await fetchJson(`/api/client/invoices/${invoice.id}/razorpay/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          await queryClient.invalidateQueries({ queryKey: getGetClientInvoiceQueryKey(invoice.id) });
          toast({ title: "Payment completed successfully" });
          setPaymentOpen(false);
        },
        modal: {
          ondismiss: () => setPaymentMessage("Razorpay checkout was closed before completion."),
        },
        theme: { color: "#0ea5e9" },
      });

      setPaymentMessage("");
      checkout.open();
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "Unable to open Razorpay checkout");
    } finally {
      setIsRazorpayLoading(false);
    }
  };

  const upiLink = useMemo(() => {
    if (!invoice || !upi?.enabled || !upi.upiId) return "";
    const number = invoice.invoiceNumber || `INV-${invoice.id.toString().padStart(4, '0')}`;
    const inrAmount = getInrAmount(invoice.amount, invoice.currency, rates);
    const params = new URLSearchParams({
      pa: upi.upiId,
      pn: upi.payeeName || "SkyHostSolutions",
      am: inrAmount.toFixed(2),
      cu: "INR",
      tn: `Invoice ${number}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [invoice, rates, upi]);

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full max-w-3xl mx-auto" /></div>;
  if (!invoice) return <div>Invoice not found</div>;

  const invoiceNumber = invoice.invoiceNumber || `INV-${invoice.id.toString().padStart(4, '0')}`;
  const invoiceOrderName =
    (invoice as { orderName?: string | null; serviceName?: string | null }).orderName ??
    (invoice as { serviceName?: string | null }).serviceName ??
    null;
  const invoiceServiceId = (invoice as { serviceId?: number | null }).serviceId ?? null;
  const upiAmountInInr = getInrAmount(invoice.amount, invoice.currency, rates);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">PAID</Badge>;
      case 'unpaid': return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20">UNPAID</Badge>;
      case 'overdue': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">OVERDUE</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : currency === "EUR" ? "en-IE" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const amountFormatted = formatAmount(invoice.amount, invoice.currency);
    const issuedDate = format(new Date(invoice.createdAt), "MMMM d, yyyy");
    const dueDate = format(new Date(invoice.dueDate), "MMMM d, yyyy");
    const paidNote = invoice.paidAt
      ? `<div style="background:#dcfce7;color:#166534;padding:12px 16px;border-radius:8px;text-align:center;font-size:13px;font-weight:600;margin-top:24px;">
           Paid in full on ${format(new Date(invoice.paidAt), "MMMM d, yyyy 'at' h:mm a")}
         </div>`
      : '';

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0ea5e9; padding-bottom: 28px; margin-bottom: 28px; }
    .brand { font-size: 22px; font-weight: 800; color: #0ea5e9; }
    .brand-address { font-size: 12px; color: #555; margin-top: 6px; line-height: 1.7; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: 300; color: #1a1a2e; }
    .invoice-number { font-size: 13px; color: #777; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-top: 8px;
      ${invoice.status === 'paid' ? 'background:#dcfce7;color:#166534;' : invoice.status === 'overdue' ? 'background:#fee2e2;color:#991b1b;' : 'background:#ffedd5;color:#9a3412;'} }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .bill-to { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 6px; }
    .client-name { font-size: 15px; font-weight: 600; }
    .date-block { text-align: right; }
    .date-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
    .date-value { font-size: 14px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    th { background: #f3f4f6; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #374151; }
    th.right { text-align: right; }
    td { padding: 16px; font-size: 14px; border-top: 1px solid #e5e7eb; }
    td.right { text-align: right; font-weight: 600; }
    .notes { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .total-row td { background: #f9fafb; font-weight: 700; font-size: 16px; border-top: 2px solid #e5e7eb; }
    .total-amount { color: #0ea5e9; }
    .footer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SkyHostSolutions</div>
      <div class="brand-address">100 Tech Hub Blvd, Suite 500<br/>San Francisco, CA 94105<br/>support@skyhostsolutions.com</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">#${invoiceNumber}</div>
      <div class="status-badge">${invoice.status.toUpperCase()}</div>
    </div>
  </div>
  <div class="meta-row">
    <div>
      <div class="bill-to">Bill To:</div>
      <div class="client-name">${invoice.clientName || 'Client'}</div>
    </div>
    <div class="date-block">
      <div style="display:flex;gap:32px;">
        <div>
          <div class="date-label">Invoice Date</div>
          <div class="date-value">${issuedDate}</div>
        </div>
        <div>
          <div class="date-label">Due Date</div>
          <div class="date-value" style="${invoice.status === 'overdue' ? 'color:#ef4444;font-weight:700;' : ''}">${dueDate}</div>
        </div>
      </div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div>Order #${invoice.orderId}</div>
          ${invoiceOrderName ? `<div class="notes">Service: ${invoiceOrderName}</div>` : ''}
          ${invoiceServiceId ? `<div class="notes">Service ID: #${invoiceServiceId}</div>` : ''}
          <div class="notes">Invoice ID: #${invoice.id}</div>
          ${invoice.notes ? `<div class="notes">${invoice.notes}</div>` : ''}
        </td>
        <td class="right">${amountFormatted}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td style="text-align:right;">Total Due:</td>
        <td class="right total-amount">${amountFormatted}</td>
      </tr>
    </tfoot>
  </table>
  ${paidNote}
  <div class="footer">Thank you for your business — SkyHostSolutions.com</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link href="/dashboard/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {invoice.status !== 'paid' && (
            <Button onClick={() => setPaymentOpen(true)}><CreditCard className="mr-2 h-4 w-4" /> Pay Now</Button>
          )}
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start border-b pb-8 mb-8 gap-6">
            <div>
              <div className="font-bold text-2xl mb-1 text-primary">SkyHostSolutions</div>
              <div className="text-sm text-muted-foreground">
                100 Tech Hub Blvd, Suite 500<br />
                San Francisco, CA 94105<br />
                support@skyhostsolutions.com
              </div>
            </div>
            <div className="text-left md:text-right">
              <h1 className="text-3xl font-light mb-2">INVOICE</h1>
              <div className="text-sm text-muted-foreground mb-4">#{invoiceNumber}</div>
              {getStatusBadge(invoice.status)}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between mb-12 gap-8">
            <div>
              <div className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Bill To:</div>
              <div className="font-medium">{invoice.clientName}</div>
            </div>
            <div className="flex gap-12 text-sm">
              <div>
                <div className="font-semibold mb-1 text-muted-foreground uppercase tracking-wider">Invoice Date:</div>
                <div>{format(new Date(invoice.createdAt), "MMM d, yyyy")}</div>
              </div>
              <div>
                <div className="font-semibold mb-1 text-muted-foreground uppercase tracking-wider">Due Date:</div>
                <div className={invoice.status === 'overdue' ? 'text-red-500 font-medium' : ''}>
                  {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Description</th>
                  <th className="text-right p-4 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-4">
                    <div className="font-medium">Order #{invoice.orderId}</div>
                    {invoiceOrderName && <div className="text-muted-foreground mt-1">Service: {invoiceOrderName}</div>}
                    {invoiceServiceId && <div className="text-muted-foreground mt-1">Service ID: #{invoiceServiceId}</div>}
                    <div className="text-muted-foreground mt-1">Invoice ID: #{invoice.id}</div>
                    {invoice.notes && <div className="text-muted-foreground mt-1">{invoice.notes}</div>}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 bg-muted/20">
                <tr>
                  <td className="p-4 text-right font-bold text-lg">Total Due:</td>
                  <td className="p-4 text-right font-bold text-lg text-primary">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice.paidAt && (
            <div className="bg-green-500/10 text-green-500 p-4 rounded-lg text-center text-sm font-medium">
              Paid in full on {format(new Date(invoice.paidAt), "MMMM d, yyyy 'at' h:mm a")}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Invoice {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount due</span>
                <strong>{formatAmount(invoice.amount, invoice.currency)}</strong>
              </div>
            </div>
            {paymentMessage && (
              <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                {paymentMessage}
              </div>
            )}
            <Button className="w-full" onClick={handleRazorpayPayment} disabled={isRazorpayLoading}>
              <CreditCard className="mr-2 h-4 w-4" />
              {isRazorpayLoading ? "Opening Razorpay..." : "Pay with Razorpay"}
            </Button>
            <div className="rounded-md border bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">UPI Payment</div>
                  <div className="text-xs text-muted-foreground">{upi?.enabled ? upi.payeeName : "UPI is not configured yet."}</div>
                </div>
                {upi?.enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      navigator.clipboard?.writeText(upi.upiId);
                      toast({ title: "UPI ID copied" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                )}
              </div>
              {upi?.enabled && (
                <>
                  <div className="rounded-md bg-background border px-3 py-2 font-mono text-sm break-all">{upi.upiId}</div>
                  <div className="rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="text-muted-foreground">UPI amount</div>
                    <div className="font-semibold">
                      {formatAmount(upiAmountInInr, "INR")}
                      {invoice.currency !== "INR" && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          converted from {formatAmount(invoice.amount, invoice.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                  {upi.qrImageUrl && (
                    <img src={upi.qrImageUrl} alt="UPI QR code" className="mx-auto h-40 w-40 rounded-md border object-contain bg-white p-2" />
                  )}
                  <p className="text-sm text-muted-foreground">{upi.instructions}</p>
                  {upiLink && (
                    <Button variant="secondary" className="w-full" asChild>
                      <a href={upiLink}>Open UPI App</a>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
