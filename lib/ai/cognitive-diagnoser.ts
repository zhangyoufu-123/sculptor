// Minimal types — full engine replaced by cognitive-runtime.ts + moves.ts + primitives.ts

export enum ThinkingStage {
  Spark = 0,
  Topic = 1,
  Question = 2,
  Position = 3,
  Evidence = 4,
  Structure = 5,
  Writing = 6,
}

export const STAGE_LABELS: Record<number, string> = {
  [ThinkingStage.Spark]: "念头",
  [ThinkingStage.Topic]: "主题",
  [ThinkingStage.Question]: "问题",
  [ThinkingStage.Position]: "立场",
  [ThinkingStage.Evidence]: "证据",
  [ThinkingStage.Structure]: "结构",
  [ThinkingStage.Writing]: "写作",
};

export const GAP_QUESTIONS: Record<string, (t: string) => string> = {
  "动机": (t) => `为什么是「${t}」而不是别的话题？`,
  "边界": (t) => `「${t}」的边界在哪里？`,
  "具体例子": (t) => `关于「${t}」，能说一个真实的场景吗？`,
  "不同角度": (t) => `如果立场相反的人来讨论「${t}」，他们会说什么？`,
  "自己的观点": (t) => `关于「${t}」，你有没有一个别人可能不同意的观点？`,
  "反例": (t) => `有没有一个具体的反例，让「${t}」站不住脚？`,
  "证据": (t) => `支持你关于「${t}」的立场，最有力的证据是什么？`,
  "受众": (t) => `你关于「${t}」的内容，最想让谁读到？`,
  "结构": (t) => `如果要说服别人接受你对「${t}」的看法，你会按什么顺序讲？`,
};
