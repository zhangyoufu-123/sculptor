// lib/ai/genre-detector.ts — v8.0: 12-genre content-based detection
// Scans user input keywords to determine writing genre

export type Genre = 
  | "议论文" | "记叙文" | "说明文" | "散文" | "游记"
  | "论文" | "朋友圈" | "视频文案" | "戏剧" | "诗歌" | "演讲稿" | "商业文案";

export interface GenreInfo {
  genre: Genre;
  label: string;       // display name
  icon: string;        // emoji
  description: string; // one-line description
  nodeTypes: string[]; // supported node types for this genre
}

export const GENRE_INFO: Record<Genre, GenreInfo> = {
  "议论文": { genre: "议论文", label: "议论文", icon: "📝", description: "论述观点、论证分析", nodeTypes: ["thesis","argument","counterargument","evidence","rebuttal","conclusion","hook","background"] },
  "记叙文": { genre: "记叙文", label: "记叙文", icon: "📖", description: "讲述故事、叙述经历", nodeTypes: ["hook","scene","climax","reflection","background","departure"] },
  "说明文": { genre: "说明文", label: "说明文", icon: "📋", description: "解释概念、阐明原理", nodeTypes: ["hook","definition","component","step","summary"] },
  "散文":   { genre: "散文", label: "散文", icon: "🌸", description: "抒情写意、随笔感悟", nodeTypes: ["hook","imagery","reflection"] },
  "游记":   { genre: "游记", label: "游记", icon: "✈️", description: "记录旅程、分享见闻", nodeTypes: ["hook","departure","scene","impression","reflection"] },
  "论文":   { genre: "论文", label: "学术论文", icon: "🎓", description: "学术研究、严谨论证", nodeTypes: ["abstract","introduction","literature","method","result","discussion","conclusion"] },
  "朋友圈": { genre: "朋友圈", label: "朋友圈", icon: "💬", description: "社交分享、短文案", nodeTypes: ["hook","emotion","punchline"] },
  "视频文案": { genre: "视频文案", label: "视频脚本", icon: "🎬", description: "短视频、直播脚本", nodeTypes: ["hook","setup","body","climax","cta"] },
  "戏剧":   { genre: "戏剧", label: "戏剧剧本", icon: "🎭", description: "话剧、影视剧本", nodeTypes: ["act","scene","dialogue","stage_direction","climax"] },
  "诗歌":   { genre: "诗歌", label: "诗歌", icon: "🎵", description: "诗词、现代诗", nodeTypes: ["title","line","couplet","refrain"] },
  "演讲稿": { genre: "演讲稿", label: "演讲稿", icon: "🎤", description: "公众演讲、致辞", nodeTypes: ["opening","body","closing"] },
  "商业文案": { genre: "商业文案", label: "商业文案", icon: "💼", description: "广告、品牌文案", nodeTypes: ["headline","subhead","body","features","cta"] },
};

// Keyword → Genre mapping (ordered by priority)
const KEYWORD_RULES: { keywords: RegExp; genre: Genre }[] = [
  { keywords: /论文|学术|研究|文献|期刊/, genre: "论文" },
  { keywords: /朋友圈|配文|文案.*短|短文案|发个圈/, genre: "朋友圈" },
  { keywords: /视频|脚本|抖音|B站|b站|字幕|剪辑|拍摄|短片/, genre: "视频文案" },
  { keywords: /戏剧|剧本|话剧|舞台|台词|对白|独白/, genre: "戏剧" },
  { keywords: /诗|词|诗歌|写诗|填词|古诗|唐诗|宋词|现代诗/, genre: "诗歌" },
  { keywords: /演讲|发言|致辞|演讲稿|讲话|开场白|闭幕/, genre: "演讲稿" },
  { keywords: /广告|推广|品牌|营销|slogan|海报|推广文案/, genre: "商业文案" },
  { keywords: /故事|经历|回忆|那年|曾经|记得|小时候/, genre: "记叙文" },
  { keywords: /解释|说明|为什么|什么是|原理|定义|概念|如何|怎么/, genre: "说明文" },
  { keywords: /散文|随笔|感悟|心境|随笔|随想/, genre: "散文" },
  { keywords: /游记|旅行|之旅|景点|游|去了|行程/, genre: "游记" },
];

/** Detect genre from user input text */
export function detectGenre(text: string): Genre {
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.test(text)) return rule.genre;
  }
  return "议论文"; // default
}

/** Get genre info by name */
export function getGenreInfo(genre: string): GenreInfo {
  return GENRE_INFO[genre as Genre] || GENRE_INFO["议论文"];
}

/** Get all genre options for selection UI */
export function getGenreOptions(): { genre: Genre; label: string; icon: string; description: string }[] {
  return Object.values(GENRE_INFO).map(g => ({
    genre: g.genre, label: g.label, icon: g.icon, description: g.description,
  }));
}

/** Suggest genres that might match the input (for confirm-genre API) */
export function suggestGenres(text: string, limit = 4): GenreInfo[] {
  const detected = detectGenre(text);
  const scored: { genre: Genre; score: number }[] = [];

  for (const rule of KEYWORD_RULES) {
    const matches = (text.match(rule.keywords) || []).length;
    if (matches > 0) scored.push({ genre: rule.genre, score: matches });
  }

  scored.sort((a, b) => b.score - a.score);
  const genres = scored.slice(0, limit).map(s => s.genre);
  
  // Always include detected genre
  if (!genres.includes(detected)) genres.unshift(detected);
  
  return genres.slice(0, limit).map(g => GENRE_INFO[g]);
}
