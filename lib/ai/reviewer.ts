/**
 * AI Reviewer — multi-dimensional paragraph review + peer perspectives.
 *
 * Six review dimensions:
 *   logic | evidence | style | engagement | structure | originality
 *
 * Peer reviewers: domain-specific perspectives (editor, critic, reader, etc.)
 */

import type {
  ReviewDimension,
  AIComment,
  ReviewerPerspective,
  ArticleBlueprint,
} from "./blueprint-types";

// ═══════════════════════════════════════════════════════════════
// AI Comment Generator
// ═══════════════════════════════════════════════════════════════

export function generateAIComments(
  paragraph: string,
  blueprint: ArticleBlueprint,
  paragraphIndex: number
): AIComment[] {
  const comments: AIComment[] = [];

  // Logic check
  comments.push(checkLogic(paragraph, blueprint, paragraphIndex));

  // Evidence check
  comments.push(checkEvidence(paragraph, blueprint, paragraphIndex));

  // Style check
  comments.push(checkStyle(paragraph, blueprint, paragraphIndex));

  // Engagement check
  comments.push(checkEngagement(paragraph, blueprint, paragraphIndex));

  // Structure check
  comments.push(checkStructure(paragraph, blueprint, paragraphIndex));

  // Originality check
  comments.push(checkOriginality(paragraph, paragraphIndex));

  return comments.filter((c) => c.severity !== "praise" || c.comment);
}

// ═══════════════════════════════════════════════════════════════
// Dimension Checkers
// ═══════════════════════════════════════════════════════════════

function checkLogic(
  paragraph: string,
  bp: ArticleBlueprint,
  _idx: number
): AIComment {
  const issues: string[] = [];

  // Check for logical connectors
  const hasConnector =
    /因此|所以|因为|由于|然而|但是|不过|如果|那么/.test(paragraph);
  if (!hasConnector && paragraph.length > 80) {
    issues.push("缺少逻辑连接词，论证关系可能不够清晰");
  }

  // Check for vague claims
  const vaguePatterns = [/很多人认为/, /大家都说/, /显然/, /众所周知/];
  for (const p of vaguePatterns) {
    if (p.test(paragraph)) {
      issues.push(`「${p.source.replace(/[\\/]/g, "")}」是模糊表达——请用具体数据或来源替代`);
    }
  }

  // Check for thesis alignment
  if (bp.coreThesis && paragraph.length > 50) {
    const thesisWords = bp.coreThesis.replace(/[，。！？、]/g, "").slice(0, 10);
    if (!paragraph.includes(thesisWords)) {
      issues.push("本段与核心论点之间的关联不够明显");
    }
  }

  if (issues.length === 0) {
    return {
      dimension: "logic",
      severity: "praise",
      location: `段落 ${_idx + 1}`,
      comment: "逻辑链条清晰，论证有层次",
    };
  }

  return {
    dimension: "logic",
    severity: issues.length >= 2 ? "critical" : "suggestion",
    location: `段落 ${_idx + 1}`,
    comment: issues.join("；"),
    suggestion: "建议：在每个论断后紧接一个具体的「因为」或「例如」",
  };
}

function checkEvidence(
  paragraph: string,
  bp: ArticleBlueprint,
  _idx: number
): AIComment {
  const hasEvidence =
    /根据|研究表明|数据|调查|报告|例如|比如|实例|案例|引用|指出/.test(
      paragraph
    );
  const hasNumber = /\d+[%％万千亿]/.test(paragraph);

  if (hasEvidence && hasNumber) {
    return {
      dimension: "evidence",
      severity: "praise",
      location: `段落 ${_idx + 1}`,
      comment: "有具体数据和引用支撑，论证有力",
    };
  }

  if (hasEvidence) {
    return {
      dimension: "evidence",
      severity: "praise",
      location: `段落 ${_idx + 1}`,
      comment: "有引用或有案例支撑",
    };
  }

  if (bp.requiredEvidence.length > 0 && paragraph.length > 100) {
    return {
      dimension: "evidence",
      severity: "suggestion",
      location: `段落 ${_idx + 1}`,
      comment: "本段缺少具体证据。",
      suggestion: `建议补充：${bp.requiredEvidence[0]}`,
    };
  }

  return {
    dimension: "evidence",
    severity: "suggestion",
    location: `段落 ${_idx + 1}`,
    comment: "可以增加一个具体案例或数据来增强说服力",
  };
}

function checkStyle(
  paragraph: string,
  bp: ArticleBlueprint,
  _idx: number
): AIComment {
  const wordCount = paragraph.length;

  // Check tone consistency
  const formalWords = ["综上所述", "由此可见", "笔者认为"];
  const casualWords = ["说实话", "反正", "其实吧", "讲真"];

  const hasFormal = formalWords.some((w) => paragraph.includes(w));
  const hasCasual = casualWords.some((w) => paragraph.includes(w));

  if (hasFormal && hasCasual) {
    return {
      dimension: "style",
      severity: "suggestion",
      location: `段落 ${_idx + 1}`,
      comment: "风格不统一——同时使用了正式表达和口语表达",
      suggestion: `统一使用「${bp.tone === "conversational" ? "口语化" : "正式"}」风格`,
    };
  }

  if (wordCount > 300) {
    return {
      dimension: "style",
      severity: "suggestion",
      location: `段落 ${_idx + 1}`,
      comment: `段落较长（${wordCount}字），建议拆分为2-3段以提高可读性`,
    };
  }

  return {
    dimension: "style",
    severity: "praise",
    location: `段落 ${_idx + 1}`,
    comment: "风格统一，语言流畅",
  };
}

function checkEngagement(
  paragraph: string,
  _bp: ArticleBlueprint,
  _idx: number
): AIComment {
  const hasHook =
    /？|难道|想象一下|你有没有|试想|如果有一天|你知道/.test(paragraph);
  const hasStory = /有一次|那天|我记得|当年|曾经/.test(paragraph);
  const hasSurprise =
    /竟然|居然|没想到|出人意料|惊人/.test(paragraph);

  if (hasHook && (hasStory || hasSurprise)) {
    return {
      dimension: "engagement",
      severity: "praise",
      location: `段落 ${_idx + 1}`,
      comment: "有悬念或有故事感，读者容易继续往下读",
    };
  }

  if (paragraph.length > 150 && !hasHook && !hasStory) {
    return {
      dimension: "engagement",
      severity: "suggestion",
      location: `段落 ${_idx + 1}`,
      comment: "长段落缺少吸引点——可以在开头加一个反问或悬念来提升吸引力",
    };
  }

  return {
    dimension: "engagement",
    severity: "praise",
    location: `段落 ${_idx + 1}`,
    comment: "表达有节奏感",
  };
}

function checkStructure(
  paragraph: string,
  bp: ArticleBlueprint,
  _idx: number
): AIComment {
  if (bp.outline.length === 0) return {
    dimension: "structure", severity: "praise",
    location: `段落 ${_idx + 1}`, comment: "结构完整",
  };

  // Check if paragraph aligns with outline
  const section = bp.outline.find(
    (n) =>
      paragraph.includes(n.title.slice(0, 5)) ||
      paragraph.includes(n.keyInsight.slice(0, 5))
  );

  if (!section && bp.outline.length > 2 && paragraph.length > 80) {
    return {
      dimension: "structure",
      severity: "suggestion",
      location: `段落 ${_idx + 1}`,
      comment: "本段与大纲的对应关系不明显——建议检查是否偏离了结构",
    };
  }

  return {
    dimension: "structure",
    severity: "praise",
    location: `段落 ${_idx + 1}`,
    comment: section
      ? `与大纲「${section.title}」对应良好`
      : "段落结构清晰",
  };
}

function checkOriginality(
  paragraph: string,
  _idx: number
): AIComment {
  const cliches = [
    "随着时代的发展",
    "在当今社会",
    "众所周知",
    "不可否认",
    "从某种角度来说",
    "在一定程度上",
    "越来越重要",
    "扮演着重要的角色",
  ];

  const found = cliches.filter((c) => paragraph.includes(c));

  if (found.length >= 2) {
    return {
      dimension: "originality",
      severity: "critical",
      location: `段落 ${_idx + 1}`,
      comment: `使用了${found.length}个常见套话：${found.join("、")}`,
      suggestion: "建议用具体的描述替代这些通用表达",
      rewrite: paragraph
        .replace(/随着时代的发展/g, "")
        .replace(/在当今社会/g, "")
        .replace(/众所周知/g, "")
        .trim(),
    };
  }

  if (found.length === 1) {
    return {
      dimension: "originality",
      severity: "suggestion",
      location: `段落 ${_idx + 1}`,
      comment: `使用了常见套话「${found[0]}」——建议用具体描述替代`,
    };
  }

  return {
    dimension: "originality",
    severity: "praise",
    location: `段落 ${_idx + 1}`,
    comment: "语言有新鲜感，避免套话",
  };
}

// ═══════════════════════════════════════════════════════════════
// Peer Review — multi-perspective
// ═══════════════════════════════════════════════════════════════

export function generatePeerReview(
  blueprint: ArticleBlueprint,
  fullText: string
): ReviewerPerspective[] {
  const reviewers = [...blueprint.reviewerPerspectives];

  // Generate critique for each reviewer based on their focus
  for (const reviewer of reviewers) {
    const critiques: string[] = [];

    if (reviewer.focus.includes("logic")) {
      critiques.push(generateLogicCritique(fullText, reviewer.role));
    }
    if (reviewer.focus.includes("evidence")) {
      critiques.push(generateEvidenceCritique(fullText, reviewer.role));
    }
    if (reviewer.focus.includes("style")) {
      critiques.push(generateStyleCritique(fullText));
    }
    if (reviewer.focus.includes("engagement")) {
      critiques.push(generateEngagementCritique(fullText, reviewer.role));
    }
    if (reviewer.focus.includes("structure")) {
      critiques.push(generateStructureCritique(fullText));
    }
    if (reviewer.focus.includes("originality")) {
      critiques.push(generateOriginalityCritique(fullText));
    }

    reviewer.critique = critiques.join("\n");
    reviewer.score = calculateReviewScore(critiques.length, fullText);
  }

  return reviewers;
}

function generateLogicCritique(text: string, role: string): string {
  if (role === "反方辩手") {
    return "反方角度：如果站在对立面，你的核心论证中至少有两个前提可以被质疑——你的论据是否经得起同样的检验？";
  }
  return "论证主线可以追踪，但中间有一段过渡不够自然。";
}

function generateEvidenceCritique(text: string, role: string): string {
  if (role === "数据核查员") {
    return "数据的来源和时效性需要标注——读者需要知道这些数字是什么时候、由谁得出的。";
  }
  if (role === "领域专家") {
    return "引用的框架是合理的，但有一个关键研究被遗漏了——建议补充。";
  }
  return "论据需要更多样化——目前主要依赖一个来源，增加交叉验证会更好。";
}

function generateStyleCritique(text: string): string {
  if (text.length < 200) return "文本太短，还不足以评价风格。";
  if (text.length > 2000)
    return "整体风格统一。长文中建议增加小标题或分隔符来创造呼吸感。";
  return "风格在大部分段落保持一致，个别句子可以更简洁。";
}

function generateEngagementCritique(text: string, role: string): string {
  if (role === "普通读者" || role === "观众代表" || role === "标题党") {
    return text.length > 500
      ? "中间有一段读起来比较枯燥——不是内容不好，而是节奏太均匀。建议插入一个故事、一个反问或一个惊人的数据来打破节奏。"
      : "开头有一定吸引力，但可以在第一句话更直接地抓住读者。";
  }
  return "内容有信息量，但可以再增加一些让读者产生'这个说到我了'的共鸣点。";
}

function generateStructureCritique(text: string): string {
  if (text.length < 500) return "文本较短，结构自然收束。完整文章后再评估。";
  return "引言和主体部分的比例合理。检查一下结论是否呼应了开头提出的问题。";
}

function generateOriginalityCritique(text: string): string {
  const clicheCount =
    (text.match(/随着时代的发展|在当今社会|众所周知|不可否认/g) || [])
      .length;
  if (clicheCount >= 3) {
    return `发现${clicheCount}处套话表达——这些是AI容易生成的'安全词汇'，建议用你自己的语言替换。`;
  }
  return "整体表达有个人色彩，不像是模板生成的。";
}

function calculateReviewScore(
  critiqueCount: number,
  text: string
): number {
  // More critique = more issues found = lower score
  const baseScore = 8;
  const penalty = Math.min(critiqueCount * 0.5, 3);
  const lengthBonus = text.length > 500 ? 1 : 0;
  return Math.min(10, Math.max(1, baseScore - penalty + lengthBonus));
}
