import { Link } from "@tanstack/react-router";

export function artistSlug(name: string) {
  return name.trim().toLocaleLowerCase("fi-FI")
    .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ArtistLink({ name, className }: { name: string; className?: string }) {
  return (
    <Link
      to="/artistit/$artist"
      params={{ artist: artistSlug(name) }}
      className={className ?? "text-primary hover:underline"}
    >
      {name}
    </Link>
  );
}
