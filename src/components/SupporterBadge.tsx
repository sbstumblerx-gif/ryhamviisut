import { Crown, Heart, Star } from "lucide-react";
import { useSupporter } from "./SupporterProvider";

export function SupporterBadge() {
  const { subscribed, appearance } = useSupporter();
  if (!subscribed) return null;
  const Icon = appearance.badge === "crown" ? Crown : appearance.badge === "heart" ? Heart : Star;
  return <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary" title="Ryhämviisut-tukija"><Icon className="h-4 w-4" />Tukija</span>;
}