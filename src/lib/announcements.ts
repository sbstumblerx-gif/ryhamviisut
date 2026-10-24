import { z } from "zod";

export function safeLink(value: string) {
  return (/^\/(?!\/)[^\\\s]*$/.test(value) || /^https?:\/\//i.test(value)) && !/[<>\s]/.test(value);
}
const mark = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("link"), attrs: z.object({ href: z.string().max(2000).refine(safeLink), target: z.string().nullable().optional(), rel: z.string().nullable().optional(), class: z.string().nullable().optional() }) }),
]);
const inline = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().max(50000), marks: z.array(mark).optional() }),
  z.object({ type: z.literal("hardBreak") }),
]);
export const announcementContent = z.object({ type: z.literal("doc"), content: z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), content: z.array(inline).optional() }),
  z.object({ type: z.literal("image"), attrs: z.object({ src: z.string().regex(/^[a-f0-9-]+\.(png|jpg|webp|gif)$/), alt: z.string().max(500).nullable().optional(), title: z.string().max(500).nullable().optional(), storagePath: z.string().nullable().optional(), width: z.number().nullable().optional(), height: z.number().nullable().optional() }) }),
])).max(500) }).refine(value => JSON.stringify(value).length <= 200000, "Tiedote on liian pitkä.");
export type AnnouncementContent = z.infer<typeof announcementContent>;
export const announcementInput = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(200), content: announcementContent });