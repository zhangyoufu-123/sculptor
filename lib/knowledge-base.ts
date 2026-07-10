// lib/knowledge-base.ts
// v6.0 — 三层知识引擎：历史风格库 → AI 创作 → 通用知识库
// 纯本地检索，零隐私泄露

// ── Types ──────────────────────────────────────────────────

export interface KnowledgeResult {
  content: string;
  source: "style-library" | "ai-generated" | "knowledge-base";
  type: "quote" | "metaphor" | "example" | "transition" | "argument-pattern";
  relevance: number; // 0-1
  metadata?: string; // attribution, context
}

interface StyleChunk {
  text: string;
  keywords: string[];
  type: string;
  tone: string;
  source: string;
}

// ── Chinese Poetry & Quote Library ─────────────────────────

const POETRY_LIBRARY: { text: string; author: string; keywords: string[]; theme: string }[] = [
  { text: "大漠孤烟直，长河落日圆。", author: "王维", keywords: ["广阔", "自然", "壮丽", "孤独", "景象"], theme: "自然景观" },
  { text: "山重水复疑无路，柳暗花明又一村。", author: "陆游", keywords: ["困境", "希望", "转折", "坚持"], theme: "人生转折" },
  { text: "落霞与孤鹜齐飞，秋水共长天一色。", author: "王勃", keywords: ["黄昏", "自然", "和谐", "美"], theme: "自然景观" },
  { text: "会当凌绝顶，一览众山小。", author: "杜甫", keywords: ["志向", "高度", "视野", "超越"], theme: "志向抱负" },
  { text: "问渠那得清如许，为有源头活水来。", author: "朱熹", keywords: ["学习", "创新", "本源", "更新"], theme: "学习思考" },
  { text: "路漫漫其修远兮，吾将上下而求索。", author: "屈原", keywords: ["坚持", "探索", "追求", "理想"], theme: "探索追求" },
  { text: "不识庐山真面目，只缘身在此山中。", author: "苏轼", keywords: ["视角", "局限", "认知", "旁观"], theme: "认知局限" },
  { text: "海内存知己，天涯若比邻。", author: "王勃", keywords: ["友情", "距离", "连接", "知己"], theme: "人际关系" },
  { text: "人生自古谁无死，留取丹心照汗青。", author: "文天祥", keywords: ["牺牲", "忠诚", "信念", "历史"], theme: "信念忠诚" },
  { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游", keywords: ["实践", "行动", "经验", "知行"], theme: "知行合一" },
  { text: "不畏浮云遮望眼，自缘身在最高层。", author: "王安石", keywords: ["远见", "格局", "高度", "视野"], theme: "高瞻远瞩" },
  { text: "千淘万漉虽辛苦，吹尽狂沙始到金。", author: "刘禹锡", keywords: ["坚持", "磨砺", "价值", "筛选"], theme: "坚持不懈" },
  { text: "欲穷千里目，更上一层楼。", author: "王之涣", keywords: ["进步", "提升", "视野", "进取"], theme: "进取提升" },
  { text: "长风破浪会有时，直挂云帆济沧海。", author: "李白", keywords: ["信心", "未来", "挑战", "希望"], theme: "信心未来" },
  { text: "莫愁前路无知己，天下谁人不识君。", author: "高适", keywords: ["离别", "鼓励", "未来", "赏识"], theme: "离别祝福" },
];

// ── Famous Quotes Library ──────────────────────────────────

const QUOTES_LIBRARY: { text: string; author: string; keywords: string[]; theme: string }[] = [
  { text: "教育不是注满一桶水，而是点燃一把火。", author: "叶芝", keywords: ["教育", "启发", "学习", "本质"], theme: "教育" },
  { text: "想象力比知识更重要。", author: "爱因斯坦", keywords: ["创造", "想象", "创新", "知识"], theme: "创新" },
  { text: "我们听到的一切都是一个观点，不是事实。我们看到的一切都是一个视角，不是真相。", author: "马可·奥勒留", keywords: ["视角", "真相", "认知", "批判"], theme: "认知" },
  { text: "未来已经到来，只是分布不均。", author: "威廉·吉布森", keywords: ["未来", "技术", "变革", "不平等"], theme: "技术变革" },
  { text: "真正的发现之旅不在于寻找新的风景，而在于拥有新的眼睛。", author: "普鲁斯特", keywords: ["发现", "视角", "创新", "认知"], theme: "认知" },
  { text: "技术的本质不是替代人类，而是放大人类的可能性。", author: "佚名", keywords: ["技术", "人类", "增强", "本质"], theme: "技术" },
  { text: "变化是唯一不变的。", author: "赫拉克利特", keywords: ["变化", "哲学", "本质", "适应"], theme: "变化" },
  { text: "我们必须接受有限的失望，但永远不失去无限的希望。", author: "马丁·路德·金", keywords: ["希望", "失望", "坚持", "信念"], theme: "信念" },
  { text: "对一个人的不公，就是对所有人的威胁。", author: "孟德斯鸠", keywords: ["公正", "社会", "正义", "权利"], theme: "公正" },
  { text: "历史不会重复，但会押韵。", author: "马克·吐温", keywords: ["历史", "规律", "循环", "启示"], theme: "历史" },
];

// ── Rhetorical Templates ───────────────────────────────────

const TEMPLATES: { text: string; type: string; keywords: string[] }[] = [
  { text: "{topic}不仅仅是一个{aspect1}问题，更是一个深刻的{aspect2}命题。", type: "递进句式", keywords: ["递进", "深化", "升华"] },
  { text: "如果我们回望{timeframe}年前的{topic}，会发现一个令人惊讶的事实：{observation}。", type: "时间对比", keywords: ["对比", "历史", "惊讶"] },
  { text: "这让我想起一个比喻：{topic}就像{metaphor}——{explanation}。", type: "比喻引入", keywords: ["比喻", "形象", "通俗"] },
  { text: "表面上看，{topic}是{surface}的问题；但深究下去，它触及的是{deeper}的命题。", type: "表里递进", keywords: ["深层", "本质", "递进"] },
  { text: "有人会说{counterargument}。这个观点不无道理，但它忽略了{rebuttal}。", type: "先破后立", keywords: ["反驳", "辩证", "全面"] },
  { text: "正如{author}所言：\"{quote}\"。这句话放在{topic}的语境下，有了新的含义。", type: "引用升华", keywords: ["引用", "升华", "权威"] },
];

// ── Style Pattern Library ──────────────────────────────────

const STYLE_PATTERNS: { pattern: string; label: string; keywords: string[] }[] = [
  { pattern: "不是...而是...", label: "否定对比", keywords: ["对比", "澄清", "否定"] },
  { pattern: "正因为...所以...", label: "因果强调", keywords: ["因果", "推理", "逻辑"] },
  { pattern: "与其...不如...", label: "选择对比", keywords: ["选择", "建议", "取舍"] },
  { pattern: "这不仅...更...", label: "递进强调", keywords: ["递进", "强调", "深化"] },
  { pattern: "在...看来，...", label: "视角引入", keywords: ["视角", "引用", "观点"] },
];

// ── Search Engine ──────────────────────────────────────────

/** Simple keyword-based relevance scorer */
function relevanceScore(query: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const q = query.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (q.includes(kw.toLowerCase())) hits++;
  }
  return Math.min(hits / Math.max(keywords.length, 1), 1);
}

/** Search poetry matching the text context */
export function searchPoetry(text: string, limit = 3): KnowledgeResult[] {
  return POETRY_LIBRARY
    .map((p) => ({
      content: `「${p.text}」——${p.author}`,
      source: "knowledge-base" as const,
      type: "quote" as const,
      relevance: relevanceScore(text, p.keywords),
      metadata: p.theme,
    }))
    .filter((r) => r.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/** Search quotes matching the text context */
export function searchQuotes(text: string, limit = 3): KnowledgeResult[] {
  return QUOTES_LIBRARY
    .map((q) => ({
      content: `"${q.text}" ——${q.author}`,
      source: "knowledge-base" as const,
      type: "quote" as const,
      relevance: relevanceScore(text, q.keywords),
      metadata: q.theme,
    }))
    .filter((r) => r.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/** Search rhetorical templates matching the text */
export function searchTemplates(text: string, limit = 2): KnowledgeResult[] {
  const topic = text.slice(0, 12).replace(/[，。！？、\s]/g, "") || "这个话题";
  return TEMPLATES
    .map((t) => ({
      content: t.text.replace(/\{topic\}/g, topic).replace(/\{aspect1\}/g, "表层").replace(/\{aspect2\}/g, "深层").replace(/\{surface\}/g, "表面").replace(/\{deeper\}/g, "本质"),
      source: "knowledge-base" as const,
      type: "argument-pattern" as const,
      relevance: relevanceScore(text, t.keywords),
      metadata: t.type,
    }))
    .filter((r) => r.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/** Search style patterns matching the writing style */
export function searchStylePatterns(text: string): KnowledgeResult[] {
  return STYLE_PATTERNS
    .map((sp) => ({
      content: `句式建议：使用「${sp.pattern}」句式——${sp.label}`,
      source: "knowledge-base" as const,
      type: "quote" as const,
      relevance: relevanceScore(text, sp.keywords),
      metadata: sp.label,
    }))
    .filter((r) => r.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 2);
}

// ── Unified Search ─────────────────────────────────────────

/** Combined search across all knowledge sources */
export function searchAll(text: string, limit = 8): KnowledgeResult[] {
  const results: KnowledgeResult[] = [
    ...searchPoetry(text, 2),
    ...searchQuotes(text, 2),
    ...searchTemplates(text, 2),
    ...searchStylePatterns(text),
  ];

  // Deduplicate
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const key = r.content.slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by relevance and diversify types
  const byType = new Map<string, KnowledgeResult[]>();
  for (const r of unique) {
    const arr = byType.get(r.type) || [];
    arr.push(r);
    byType.set(r.type, arr);
  }

  const diversified: KnowledgeResult[] = [];
  const types = Array.from(byType.keys());
  let i = 0;
  while (diversified.length < limit && diversified.length < unique.length) {
    const type = types[i % types.length];
    const items = byType.get(type) || [];
    const idx = Math.floor(i / types.length);
    if (idx < items.length) diversified.push(items[idx]);
    i++;
  }

  return diversified.slice(0, limit);
}

// ── Style Chunk Indexer ────────────────────────────────────

let styleIndex: StyleChunk[] = [];

/** Index a user document into the style library */
export function indexUserDocument(text: string, source: string): void {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 30);
  for (const para of paragraphs) {
    const keywords = para
      .replace(/[，。！？、；：""''（）\s]/g, " ")
      .split(" ")
      .filter((w) => w.length >= 2)
      .slice(0, 20);

    const tone = detectTone(para);
    const type = detectType(para);

    styleIndex.push({
      text: para.slice(0, 200),
      keywords,
      type,
      tone,
      source,
    });
  }

  // Keep index at reasonable size
  if (styleIndex.length > 500) {
    styleIndex = styleIndex.slice(-500);
  }
}

/** Search user style library for similar writing contexts */
export function searchStyleLibrary(text: string, limit = 3): KnowledgeResult[] {
  if (styleIndex.length === 0) return [];

  const queryWords = text
    .replace(/[，。！？、；：""''（）\s]/g, " ")
    .split(" ")
    .filter((w) => w.length >= 2);

  return styleIndex
    .map((chunk) => {
      let score = 0;
      for (const qw of queryWords) {
        if (chunk.keywords.includes(qw)) score += 1;
      }
      const relevance = Math.min(score / Math.max(queryWords.length, 1), 1);
      return {
        content: `你曾写过：「${chunk.text.slice(0, 60)}...」`,
        source: "style-library" as const,
        type: "example" as const,
        relevance,
        metadata: `来自《${chunk.source}》· ${chunk.type} · ${chunk.tone}`,
      };
    })
    .filter((r) => r.relevance > 0.15)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

// ── Tone/Type Detection ────────────────────────────────────

function detectTone(text: string): string {
  if (/但是|然而|不过|却|虽然/.test(text)) return "辩证";
  if (/必须|应该|一定|显然|无疑/.test(text)) return "坚定";
  if (/或许|可能|大概|也许|似乎/.test(text)) return "探索";
  if (/！/.test(text) && text.length < 150) return "激昂";
  return "平实";
}

function detectType(text: string): string {
  if (/例如|比如|比如|数据|研究|调查|显示/.test(text)) return "论据段落";
  if (/因为|所以|因此|从而|导致/.test(text)) return "推理段落";
  if (/首先|其次|最后|第一|第二|第三/.test(text)) return "列举段落";
  if (/？/.test(text)) return "设问段落";
  return "陈述段落";
}
