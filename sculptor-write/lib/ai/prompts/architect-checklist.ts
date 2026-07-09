// architect-checklist.ts — v5.1 TacitKnowledge
// Writing element completeness checker for AI-generated architecture nodes.
// Used both by the AI prompt system (to evaluate nodes) and the frontend
// (to display completeness warnings in the UI).

import type { NodeType } from "@/types/architect";

export interface ChecklistResult {
  isComplete: boolean;
  missingElements: string[];
  suggestedQuestions: string[];
  suggestedWritingTip: string;
}

/** Per-genre, per-node-type: required and optional writing elements */
const ELEMENT_RULES: Record<
  string,
  Record<string, { required: string[]; optional: string[] }>
> = {
  argumentative: {
    thesis: { required: ["核心主张"], optional: ["支撑方向", "案例来源"] },
    argument: { required: ["论点方向"], optional: ["支撑论据", "数据来源"] },
    evidence: { required: ["证据类型"], optional: ["具体数据", "引用来源"] },
    counterargument: { required: ["对立观点"], optional: ["回应方向"] },
    rebuttal: { required: ["反驳要点"], optional: ["反驳依据"] },
    hook: { required: ["注意力钩子"], optional: ["与主题关联"] },
    background: { required: ["背景信息"], optional: ["数据支撑"] },
    conclusion: { required: ["总结方向"], optional: ["行动呼吁"] },
    transition: { required: ["过渡方向"], optional: ["承上启下"] },
  },
  narrative: {
    scene: { required: ["地点"], optional: ["氛围", "感官细节", "情感基调"] },
    background: { required: ["时间背景"], optional: ["时代背景"] },
    climax: { required: ["关键转折"], optional: ["情感变化"] },
    reflection: { required: ["核心领悟"], optional: ["触发原因", "前后对比"] },
    hook: { required: ["开场方式"], optional: ["悬念设置"] },
  },
  travelogue: {
    scene: { required: ["景点名称"], optional: ["独特观察", "感官细节", "个人感受"] },
    departure: { required: ["出发背景"], optional: ["同行者", "期待心情"] },
    impression: { required: ["总体感受"], optional: ["文化观察", "情感变化"] },
    reflection: { required: ["核心感悟"], optional: ["触发瞬间"] },
    hook: { required: ["开场氛围"], optional: ["与地点关联"] },
  },
  essay: {
    imagery: { required: ["具体意象"], optional: ["关联情感", "联想方向"] },
    reflection: { required: ["感悟方向"], optional: ["与意象关联", "哲理深度"] },
    hook: { required: ["引入意象"], optional: ["情感铺垫"] },
  },
  expository: {
    definition: { required: ["核心定义"], optional: ["分类维度"] },
    component: { required: ["特征说明"], optional: ["生活类比", "常见误解"] },
    step: { required: ["步骤说明"], optional: ["注意事项"] },
    hook: { required: ["引入方式"], optional: ["与主题关联"] },
    summary: { required: ["总结方向"], optional: ["延伸思考"] },
  },
  report: {
    background: { required: ["研究背景"], optional: ["问题重要性"] },
    methodology: { required: ["研究方法"], optional: ["数据来源"] },
    finding: { required: ["发现要点"], optional: ["具体数据", "置信度"] },
    conclusion: { required: ["总结建议"], optional: ["局限说明"] },
  },
};

/**
 * Generate a system prompt fragment for the AI to self-check node completeness.
 * Insert this into the architect chat prompt when generating architecture.
 */
export const CHECKLIST_SYSTEM_PROMPT = `
## 写作要素完整性检查规则

生成架构后，你必须对每个节点进行要素完整性自检。检查规则如下：

### 议论文
| 节点类型 | 必要要素 | 缺失提示 |
|---------|---------|---------|
| thesis | 核心主张 | "论点节点缺少核心主张，请补充你的立场" |
| argument | 论点方向 | "论据节点需要明确支撑方向" |
| evidence | 证据类型 | "证据节点缺少具体案例或数据来源" |
| counterargument | 对立观点 | "反方论点需要明确具体的对立观点" |
| hook | 注意力钩子 | "开头缺少吸引读者的钩子" |
| conclusion | 总结方向 | "结论需要明确的总结方向或行动呼吁" |

### 记叙文
| 节点类型 | 必要要素 | 缺失提示 |
|---------|---------|---------|
| scene | 地点 | "场景节点缺少地点描写方向" |
| climax | 关键转折 | "高潮节点缺少情感转折点" |

### 散文
| 节点类型 | 必要要素 | 缺失提示 |
|---------|---------|---------|
| imagery | 具体意象 | "意象节点缺少具体的视觉/感官意象" |
| reflection | 感悟方向 | "感悟节点缺少明确的哲思方向" |

### 游记
| 节点类型 | 必要要素 | 缺失提示 |
|---------|---------|---------|
| scene | 景点名称 | "景点节点缺少独特观察角度" |
| impression | 总体感受 | "印象节点缺少对当地文化的观察" |

### 说明文
| 节点类型 | 必要要素 | 缺失提示 |
|---------|---------|---------|
| definition | 核心定义 | "定义节点需要一句话清晰定义" |
| component | 特征说明 | "组件节点需要生活类比帮助理解" |

检查要点：
1. 如果节点缺少必要要素，在 confirmation 的 highlight_nodes 中包含该节点ID
2. 在 suggestion 中给出具体的缺失提示和建议
3. 每个节点都应包含 writingTip（不超过30字），给出具体的写作指引
`;

/**
 * Build a self-check prompt for the AI to evaluate its generated nodes.
 */
export function buildChecklistPrompt(
  genre: string,
  nodes: { id: string; type: NodeType; title: string }[]
): string {
  const normalizedGenre = genre.toLowerCase();
  const rules = ELEMENT_RULES[normalizedGenre] || ELEMENT_RULES.argumentative;

  const nodeList = nodes
    .map((n) => {
      const typeRules = rules[n.type] || { required: ["内容要点"], optional: [] };
      return `- [${n.id}] ${n.type}: "${n.title}" (必要: ${typeRules.required.join("、")})`;
    })
    .join("\n");

  return `请对以下架构节点进行写作要素完整性检查：

文体: ${genre}
节点列表:
${nodeList}

对每个节点判断其是否具备必要要素（标题是否体现了这些要素）。将不完整的节点ID放入 highlight_nodes，并为不完整节点生成具体的suggestion。
输出格式：在confirmation响应中附带 highlight_nodes 和 suggestion 字段。`;
}

/**
 * Run a lightweight client-side completeness check on a single node.
 * Used by the frontend to display warnings without API calls.
 */
export function checkNodeCompleteness(
  genre: string,
  nodeType: NodeType,
  title: string,
  existingElements: string[] = []
): ChecklistResult {
  const normalizedGenre = genre.toLowerCase();
  const rules = ELEMENT_RULES[normalizedGenre] || ELEMENT_RULES.argumentative;
  const typeRules = rules[nodeType] || { required: ["内容要点"], optional: [] };

  const missingElements = typeRules.required.filter(
    (req) => !existingElements.some((el) => el.includes(req))
  );

  const isComplete = missingElements.length === 0;

  const suggestedQuestions = missingElements.map(
    (el) => `请补充节点的${el}`
  );

  // Generate a writing tip from existing elements
  const tipPrefix = typeRules.required[0] || "内容";
  const suggestedWritingTip =
    existingElements.length > 0
      ? `重点围绕${existingElements.slice(0, 2).join("和")}展开叙述`
      : `请先补充${tipPrefix}`;

  return {
    isComplete,
    missingElements,
    suggestedQuestions,
    suggestedWritingTip,
  };
}
