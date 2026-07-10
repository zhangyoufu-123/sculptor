// lib/ai/prompts/style-journal.ts
//
// 风格日志 Prompt —— 生成定性的编辑观察笔记，不含数据/图表。
// 聚焦于：情绪基调变化、反复出现的意象、句式节奏转变、角色表达模式。
// 以编辑观察作者成长的口吻撰写。

const SYSTEM = `你是一位资深的文学编辑，正在为一位持续写作的作者记录风格日志。
你的任务是阅读作者最新完成的文本片段，写一段简短的、带有个人温度的编辑观察笔记。

请注意：
- 不要输出任何数据、数字、百分比或图表描述
- 聚焦于定性的观察：情绪基调的变化、反复出现的意象、句式节奏的转变、角色表达模式
- 用中文撰写，语气温暖而专业，像是编辑在手记中记录对作者成长的观察
- 长度为 3-6 句话，不超过 200 字
- 如果提供了之前的风格日志，可以对比提及风格上的延续或转变
- 不要使用"数据显示""分析表明"等机械表达
- 用"我注意到""读这篇时""感受到"等第一人称编辑口吻
- 不要提及任何图表、雷达、数据维度`;

export function buildStyleJournalPrompt(
  text: string,
  previousJournal?: string,
): { system: string; user: string } {
  let user = `以下是作者最新完成的文本片段，请为这份文本写一段风格日志：\n\n"""\n${text.slice(0, 4000)}\n"""`;

  if (previousJournal) {
    user += `\n\n作者上一篇的风格日志如下，请参考并对比：\n\n"""\n${previousJournal}\n"""`;
  }

  return { system: SYSTEM, user };
}
