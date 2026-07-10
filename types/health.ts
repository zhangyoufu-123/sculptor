// types/health.ts
// 文档健康检查 — 四维度诊断：角色一致性、时间线、逻辑链、重复段落

export type FindingType =
  | "characterConsistency"
  | "timeline"
  | "logicChain"
  | "duplicates";

export type FindingSeverity = "error" | "warning" | "info";

export interface HealthFinding {
  /** 发现类型 */
  type: FindingType;
  /** 严重程度 */
  severity: FindingSeverity;
  /** 中文描述信息 */
  message: string;
  /** 问题所在文档位置（字符偏移量） */
  position: number;
  /** 问题上下文的文本片段 */
  snippet: string;
}

export interface HealthReport {
  /** 所有发现的问题 */
  findings: HealthFinding[];
  /** 文档总体健康评分 0-100 */
  overallScore: number;
  /** 各维度独立评分 */
  dimensions: {
    characterConsistency: number;
    timeline: number;
    logicChain: number;
    duplicates: number;
  };
  /** 生成时间 ISO 字符串 */
  generatedAt: string;
}

/** POST /api/document/health 请求体 */
export interface HealthCheckRequest {
  text: string;
}
