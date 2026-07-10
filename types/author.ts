// types/author.ts
// Author Memory 系统 —— 作者偏好、习惯、禁忌表达与代表作

export interface Masterpiece {
  title: string;
  excerpt: string;
  style: string;
  score: number; // 0-100 风格匹配度
}

export interface AuthorMemory {
  preferences: string[];          // 写作偏好（如：偏好短句、偏好诗化语言）
  dislikes: string[];             // 不喜欢的表达方式
  habits: string[];               // 写作习惯（如：常用冒号、偏好排比）
  masterpieces: Masterpiece[];    // 代表作列表
  forbiddenExpressions: string[]; // 禁忌表达 —— 绝对不能出现的词句
}
