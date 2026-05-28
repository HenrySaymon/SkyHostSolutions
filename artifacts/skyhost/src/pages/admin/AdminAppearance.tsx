import { useEffect, useState } from "react";
import { useAppearance, type ButtonShape, type ThemeMode } from "@/contexts/AppearanceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLOR_FIELDS = [
  ["Primary color", "primaryColor"],
  ["Background", "backgroundColor"],
  ["Panel background", "cardColor"],
  ["Text color", "textColor"],
  ["Brand Sky color", "brandSkyColor"],
  ["Brand Host color", "brandHostColor"],
  ["Brand Solutions color", "brandSolutionsColor"],
] as const;

export default function AdminAppearance() {
  const { settings, updateSettings, saveSettings, resetSettings, setThemeMode } = useAppearance();
  const { toast } = useToast();
  const [smtp, setSmtp] = useState({ host: "", port: "587", secure: false, user: "", pass: "", from: "" });

  useEffect(() => {
    fetch("/api/admin/smtp")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data) setSmtp({
          host: data.host ?? "",
          port: String(data.port ?? 587),
          secure: Boolean(data.secure),
          user: data.user ?? "",
          pass: data.pass ?? "",
          from: data.from ?? "",
        });
      })
      .catch(() => {});
  }, []);

  const updateColor = (key: (typeof COLOR_FIELDS)[number][1], value: string) => {
    updateSettings({ ...settings, [key]: value });
  };

  const updateShape = (buttonShape: ButtonShape) => {
    updateSettings({ ...settings, buttonShape });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appearance</h1>
          <p className="text-muted-foreground mt-1">Adjust website colors, theme surfaces, and button shape.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            resetSettings();
            toast({ title: "Appearance reset" });
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <Card className="bg-card">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 font-semibold">
              <Palette className="h-4 w-4 text-primary" />
              Theme Controls
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={settings.themeMode} onValueChange={(value) => setThemeMode(value as ThemeMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {COLOR_FIELDS.map(([label, key]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings[key]}
                    onChange={(event) => updateColor(key, event.target.value)}
                    className="h-10 w-12 rounded-md border border-border bg-transparent p-1"
                  />
                  <input
                    value={settings[key]}
                    onChange={(event) => updateColor(key, event.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label>Button Shape</Label>
              <Select value={settings.buttonShape} onValueChange={(value) => updateShape(value as ButtonShape)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="soft">Soft Rounded</SelectItem>
                  <SelectItem value="pill">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full gap-2"
              onClick={async () => {
                try {
                  await saveSettings();
                  toast({ title: "Appearance saved", description: "Changes are applied immediately." });
                } catch {
                  toast({ title: "Failed to save appearance", variant: "destructive" });
                }
              }}
            >
              <Save className="h-4 w-4" />
              Save Appearance
            </Button>
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-card p-6 space-y-6">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Live Preview</div>
            <h2 className="text-2xl font-bold">SkyHostSolutions</h2>
            <div className="mt-3 text-xl font-bold">
              <span style={{ color: settings.brandSkyColor }}>Sky</span>
              <span style={{ color: settings.brandHostColor }}>Host</span>
              <span style={{ color: settings.brandSolutionsColor }}>Solutions</span>
            </div>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Preview your selected colors across headings, surfaces, controls, and invoice-style panels.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-md border bg-background p-4">
              <div className="text-sm text-muted-foreground">Website Background</div>
              <div className="mt-3 font-semibold">Primary site surface</div>
            </div>
            <div className="rounded-md border bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Muted Surface</div>
              <div className="mt-3 font-semibold">Dashboard panels and tables</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button>Primary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="secondary">Secondary Button</Button>
          </div>
        </div>
      </div>

      <Card className="bg-card max-w-3xl">
        <CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold">SMTP Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">Used by admin invoice email sending.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input value={smtp.host} onChange={(e) => setSmtp((p) => ({ ...p, host: e.target.value }))} placeholder="smtp.example.com" />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input value={smtp.port} onChange={(e) => setSmtp((p) => ({ ...p, port: e.target.value }))} placeholder="587" />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={smtp.user} onChange={(e) => setSmtp((p) => ({ ...p, user: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={smtp.pass} onChange={(e) => setSmtp((p) => ({ ...p, pass: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>From Email</Label>
              <Input value={smtp.from} onChange={(e) => setSmtp((p) => ({ ...p, from: e.target.value }))} placeholder="SkyHostSolutions <billing@example.com>" />
            </div>
            <label className="flex items-center gap-3 rounded-md border bg-muted/20 p-3 text-sm md:col-span-2">
              <Switch checked={smtp.secure} onCheckedChange={(checked) => setSmtp((p) => ({ ...p, secure: checked }))} />
              Use secure SMTP connection
            </label>
          </div>
          <Button
            onClick={async () => {
              try {
                const response = await fetch("/api/admin/smtp", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...smtp, port: Number(smtp.port) || 587 }),
                });
                if (!response.ok) throw new Error("Failed");
                toast({ title: "SMTP settings saved" });
              } catch {
                toast({ title: "Failed to save SMTP settings", variant: "destructive" });
              }
            }}
          >
            Save SMTP Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
