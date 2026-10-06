export type ProjectGateway = {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  statement: string;
  proof: string;
  accent: string;
};

export const projects: ProjectGateway[] = [
  {
    id: "pangu",
    index: "01",
    eyebrow: "AIGC PRODUCT / OPERATIONS",
    title: "盘古智绘",
    statement: "不教商户写 Prompt，而是把 Prompt 变成选字段。",
    proof: "9 行业 · 230+ 场景 · 2500+ Prompt · 3 轮 A/B",
    accent: "#5f875f",
  },
  {
    id: "xhs",
    index: "02",
    eyebrow: "CONTENT / USER INSIGHT",
    title: "小红书内容运营",
    statement: "把 AI 卖点，翻译成用户能感知、愿意停留的内容。",
    proof: "HOOK → VALUE → CONVERSION",
    accent: "#d85e54",
  },
  {
    id: "noteguard",
    index: "03",
    eyebrow: "AI PRODUCT / HUMAN-IN-THE-LOOP",
    title: "NoteGuard AI",
    statement: "让 AI 给建议，但把最后的判断权留给人。",
    proof: "Final Test 51.25% → 96.25% · 6 users · 36 contents",
    accent: "#2e7b68",
  },
];
