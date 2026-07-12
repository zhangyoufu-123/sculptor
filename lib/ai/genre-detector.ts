// lib/ai/genre-detector.ts — v8.0 task-based detection
// 基于写作任务类型检测，而非文学体裁

export type Genre = 
  | "论文" | "博客" | "公众号" | "报告" | "邮件" | "演讲" | "日记" | "其它";

export interface GenreInfo {
  genre: Genre;
  label: string;       // display name
  description: string; // one-line description
  nodeTypes: string[]; // supported node types for this task
}

export const GENRE_INFO: Record<Genre, GenreInfo> = {
  "论文": {
    genre: "论文",
    label: "论文",
    description: "学术写作、研究论证",
    nodeTypes: ["abstract", "introduction", "literature", "method", "result", "discussion", "conclusion"],
  },
  "博客": {
    genre: "博客",
    label: "博客",
    description: "技术博客、心得分享",
    nodeTypes: ["hook", "introduction", "body", "example", "conclusion"],
  },
  "公众号": {
    genre: "公众号",
    label: "公众号",
    description: "公众号文章、新媒体写作",
    nodeTypes: ["hook", "lead", "body", "section", "cta"],
  },
  "报告": {
    genre: "报告",
    label: "报告",
    description: "工作报告、总结分析",
    nodeTypes: ["background", "methodology", "finding", "analysis", "conclusion"],
  },
  "邮件": {
    genre: "邮件",
    label: "邮件",
    description: "商务邮件、正式信函",
    nodeTypes: ["subject", "greeting", "body", "call_to_action", "closing"],
  },
  "演讲": {
    genre: "演讲",
    label: "演讲",
    description: "演讲稿、发言致辞",
    nodeTypes: ["opening", "body_point", "story", "climax", "closing"],
  },
  "日记": {
    genre: "日记",
    label: "日记",
    description: "个人日记、日常记录",
    nodeTypes: ["date", "event", "reflection", "emotion"],
  },
  "其它": {
    genre: "其它",
    label: "其它",
    description: "自由写作、通用创作",
    nodeTypes: ["hook", "body", "conclusion"],
  },
};

// 关键词 → 任务类别映射（按优先级排序）
const KEYWORD_RULES: { keywords: RegExp; genre: Genre }[] = [
  { keywords: /论文|学术|研究|文献|引用|APA|MLA|摘要|关键词|参考文献|abstract|introduction|methodology|conclusion/, genre: "论文" },
  { keywords: /博客|blog|技术|教程|分享|心得/, genre: "博客" },
  { keywords: /公众号|微信|推送|排版|粉丝|阅读量/, genre: "公众号" },
  { keywords: /报告|汇报|周报|月报|总结|分析/, genre: "报告" },
  { keywords: /邮件|email|尊敬的|您好|此致/, genre: "邮件" },
  { keywords: /演讲|发言|致辞|演讲稿|开场白|结束语/, genre: "演讲" },
  { keywords: /日记|记录|今天|心情/, genre: "日记" },
];

/** 从用户输入文本检测写作任务类型 */
export function detectGenre(text: string): Genre {
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.test(text)) return rule.genre;
  }
  return "其它"; // 默认回退
}

/** 根据名称获取任务类型信息 */
export function getGenreInfo(genre: string): GenreInfo {
  return GENRE_INFO[genre as Genre] || GENRE_INFO["其它"];
}

/** 获取所有任务类别选项（供选择界面使用） */
export function getGenreOptions(): { genre: Genre; label: string; description: string }[] {
  return Object.values(GENRE_INFO).map(g => ({
    genre: g.genre,
    label: g.label,
    description: g.description,
  }));
}

/** 推荐可能匹配输入的任务类别（供确认接口使用） */
export function suggestGenres(text: string, limit = 4): GenreInfo[] {
  const detected = detectGenre(text);
  const scored: { genre: Genre; score: number }[] = [];

  for (const rule of KEYWORD_RULES) {
    const matches = (text.match(rule.keywords) || []).length;
    if (matches > 0) scored.push({ genre: rule.genre, score: matches });
  }

  scored.sort((a, b) => b.score - a.score);
  const genres = scored.slice(0, limit).map(s => s.genre);
  
  // 始终包含检测到的类别
  if (!genres.includes(detected)) genres.unshift(detected);
  
  return genres.slice(0, limit).map(g => GENRE_INFO[g]);
}
