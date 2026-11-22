import { Crown, Heart, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { useSupporter } from "./SupporterProvider";

const palettes = [{ value: "original", label: "Alkuperäinen", swatch: "bg-palette-original" },
  { value: "mint", label: "Minttu", swatch: "bg-palette-mint" }, { value: "rose", label: "Ruusu", swatch: "bg-palette-rose" }] as const;
const badges = [{ value: "star", label: "Tähti", Icon: Star }, { value: "heart", label: "Sydän", Icon: Heart }, { value: "crown", label: "Kruunu", Icon: Crown }] as const;

export function SupporterAppearance() {
  const { subscribed, appearance, updateAppearance } = useSupporter();
  return <section className="space-y-5 border-t border-border py-6">
    <h2 className="text-2xl">Tukijan ulkoasu</h2>
    <fieldset disabled={!subscribed} className="space-y-3 disabled:opacity-50">
      <legend className="mb-2 text-sm font-medium">Korostusväri</legend>
      <div className="flex flex-wrap gap-3">{palettes.map(({ value, label, swatch }) => <Button key={value} variant="outline" size="icon" className={appearance.palette === value ? "ring-2 ring-primary" : ""} title={label} aria-label={label} aria-pressed={appearance.palette === value} onClick={() => updateAppearance({ palette: value })}><span className={`h-5 w-5 rounded-full ${swatch}`} /></Button>)}</div>
    </fieldset>
    <div className="flex max-w-sm items-center justify-between gap-4"><label htmlFor="supporter-backdrop" className="text-sm font-medium">Taustakuva</label><Switch id="supporter-backdrop" disabled={!subscribed} checked={appearance.backdrop} onCheckedChange={(backdrop) => updateAppearance({ backdrop })} /></div>
    <fieldset disabled={!subscribed} className="disabled:opacity-50"><legend className="mb-3 text-sm font-medium">Tukijamerkki</legend><div className="flex gap-3">{badges.map(({ value, label, Icon }) => <Button key={value} size="icon" variant={appearance.badge === value ? "default" : "outline"} title={label} aria-label={label} aria-pressed={appearance.badge === value} onClick={() => updateAppearance({ badge: value })}><Icon /></Button>)}</div></fieldset>
  </section>;
}