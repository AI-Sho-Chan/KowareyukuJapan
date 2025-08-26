export const FIXED_TAGS = [
  "治安/マナー","ニュース","政治/制度","動画","画像",
  "外国人犯罪","中国人","クルド人","媚中政治家","財務省",
  "官僚","左翼","保守","日本","帰化人","帰化人政治家","歴史捏造"
] as const;

export function formatHandle(h?: string): string {
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}


