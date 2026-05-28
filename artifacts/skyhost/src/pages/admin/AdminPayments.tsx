import { useEffect, useState } from "react";
import { CreditCard, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type RazorpaySettings = {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  accountName: string;
  description: string;
};

type UpiSettings = {
  enabled: boolean;
  upiId: string;
  payeeName: string;
  instructions: string;
  qrImageUrl: string;
};

export default function AdminPayments() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<RazorpaySettings>({
    enabled: false,
    keyId: "",
    keySecret: "",
    accountName: "",
    description: "",
  });
  const [upi, setUpi] = useState<UpiSettings>({
    enabled: false,
    upiId: "",
    payeeName: "",
    instructions: "",
    qrImageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => {
    fetch("/api/admin/payments/razorpay")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setSettings({
            enabled: Boolean(data.enabled),
            keyId: data.keyId ?? "",
            keySecret: data.keySecret ?? "",
            accountName: data.accountName ?? "",
            description: data.description ?? "",
          });
        }
      })
      .catch(() => {});
    fetch("/api/admin/payments/upi")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setUpi({
            enabled: Boolean(data.enabled),
            upiId: data.upiId ?? "",
            payeeName: data.payeeName ?? "",
            instructions: data.instructions ?? "",
            qrImageUrl: data.qrImageUrl ?? "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const update = <K extends keyof RazorpaySettings>(key: K, value: RazorpaySettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateUpi = <K extends keyof UpiSettings>(key: K, value: UpiSettings[K]) => {
    setUpi((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments/razorpay", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save Razorpay settings");
      setSettings({
        enabled: Boolean(data.enabled),
        keyId: data.keyId ?? "",
        keySecret: data.keySecret ?? "",
        accountName: data.accountName ?? "",
        description: data.description ?? "",
      });
      toast({ title: "Razorpay receiver account saved" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to save Razorpay settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveUpi = async () => {
    setSavingUpi(true);
    try {
      const response = await fetch("/api/admin/payments/upi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upi),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save UPI settings");
      setUpi({
        enabled: Boolean(data.enabled),
        upiId: data.upiId ?? "",
        payeeName: data.payeeName ?? "",
        instructions: data.instructions ?? "",
        qrImageUrl: data.qrImageUrl ?? "",
      });
      toast({ title: "UPI payment details saved" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to save UPI settings",
        variant: "destructive",
      });
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">Manage the Razorpay receiver account used for client invoice payments.</p>
      </div>

      <Card className="bg-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-semibold">
              <CreditCard className="h-4 w-4 text-primary" />
              Razorpay Receiver Account
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Enabled</span>
              <Switch checked={settings.enabled} onCheckedChange={(checked) => update("enabled", checked)} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Key ID</Label>
              <Input value={settings.keyId} onChange={(event) => update("keyId", event.target.value)} placeholder="rzp_live_..." />
            </div>
            <div className="space-y-2">
              <Label>Key Secret</Label>
              <Input
                type="password"
                value={settings.keySecret}
                onChange={(event) => update("keySecret", event.target.value)}
                placeholder="Razorpay key secret"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={settings.accountName} onChange={(event) => update("accountName", event.target.value)} placeholder="SkyHostSolutions" />
            </div>
            <div className="space-y-2">
              <Label>Checkout Description</Label>
              <Input
                value={settings.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="SkyHostSolutions invoice payment"
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Razorpay Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-semibold">
              <CreditCard className="h-4 w-4 text-primary" />
              UPI Payment Details
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Enabled</span>
              <Switch checked={upi.enabled} onCheckedChange={(checked) => updateUpi("enabled", checked)} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <Input value={upi.upiId} onChange={(event) => updateUpi("upiId", event.target.value)} placeholder="name@bank" />
            </div>
            <div className="space-y-2">
              <Label>Payee Name</Label>
              <Input value={upi.payeeName} onChange={(event) => updateUpi("payeeName", event.target.value)} placeholder="SkyHostSolutions" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>QR Image URL</Label>
              <Input value={upi.qrImageUrl} onChange={(event) => updateUpi("qrImageUrl", event.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Client Instructions</Label>
              <Input
                value={upi.instructions}
                onChange={(event) => updateUpi("instructions", event.target.value)}
                placeholder="Pay by UPI and share the transaction reference with support."
              />
            </div>
          </div>

          <Button onClick={saveUpi} disabled={savingUpi} className="gap-2">
            <Save className="h-4 w-4" />
            {savingUpi ? "Saving..." : "Save UPI Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
