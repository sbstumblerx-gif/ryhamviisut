import type { ReactNode } from "react";
import { announcementContent, safeLink } from "@/lib/announcements";

export function AnnouncementBody({ content, images }: { content: unknown; images: Record<string, string> }) {
  const parsed = announcementContent.safeParse(content);
  if (!parsed.success) return null;
  return <div className="announcement-body">{parsed.data.content.map((node, index) => {
    if (node.type === "image") return images[node.attrs.src] ? <img key={index} src={images[node.attrs.src]} alt={node.attrs.alt ?? "Tiedotteen kuva"} /> : null;
    return <p key={index}>{node.content?.map((part, i) => {
      if (part.type === "hardBreak") return <br key={i} />;
      let text: ReactNode = part.text;
      for (const mark of part.marks ?? []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        if (mark.type === "italic") text = <em>{text}</em>;
        if (mark.type === "link" && safeLink(mark.attrs.href)) text = <a href={mark.attrs.href} rel="noopener noreferrer">{text}</a>;
      }
      return <span key={i}>{text}</span>;
    })}</p>;
  })}</div>;
}