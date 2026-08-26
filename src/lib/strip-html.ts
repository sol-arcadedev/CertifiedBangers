// AniList's `description(asHtml: false)` field only controls whether <br>
// becomes a real line break — it does NOT strip other inline formatting
// tags (<b>, <i>, <a>, etc.), which come through as literal text. Applied
// as a defensive display-time pass on every synopsis, since the database
// can't be trusted to already be clean — rows mirrored before this existed
// still carry the raw tags until their next daily refresh.
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
