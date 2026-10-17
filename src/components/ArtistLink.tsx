import { Link } from "@tanstack/react-router";

export function artistKey(name: string) {
  return name.trim().toLocaleLowerCase("fi-FI");
}

export function ArtistLink({ name, className }: { name: string; className?: string }) {
  return (
    <Link
      to="/artistit/$artist"
      params={{ artist: artistKey(name) }}
      className={className ?? "text-primary hover:underline"}
    >
      {name}
    </Link>
  );
}
