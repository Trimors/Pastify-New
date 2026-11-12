import { ogCard, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Pastify";

export default function Image() {
  return ogCard({ title: "Paste once. Earn forever.", meta: "Share code, text and links. Get paid for every unlock." });
}
