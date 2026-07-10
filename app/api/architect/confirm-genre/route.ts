import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 30;

const GENRE_OPTIONS = [
  { name: "议论文", description: "论述观点、论证分析，适合表达立场", icon: "📝" },
  { name: "记叙文", description: "讲述故事、叙述经历，适合个人叙事", icon: "📖" },
  { name: "散文", description: "抒情写意、自由表达，适合情感抒发", icon: "🌸" },
  { name: "说明文", description: "解释说明、科普知识，适合传递信息", icon: "📋" },
  { name: "报告", description: "数据分析、调研结论，适合正式场合", icon: "📊" },
  { name: "游记", description: "记录旅行、见闻感受，适合分享体验", icon: "✈️" },
  { name: "书评/影评", description: "评价作品、分析优劣，适合文化评论", icon: "🎬" },
  { name: "新闻稿", description: "客观报道、事实陈述，适合信息发布", icon: "📰" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput } = body;

    if (!userInput || userInput.length < 2) {
      return Response.json({ genres: GENRE_OPTIONS.slice(0, 4) });
    }

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Based on the user's writing topic, recommend 3-4 most suitable genres from this list: ${JSON.stringify(GENRE_OPTIONS.map(g => g.name))}. Output JSON: {"genres":["genre1","genre2","genre3"]}. If the user already specified a genre, return just that one.`,
        },
        { role: "user", content: userInput },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return Response.json({ genres: GENRE_OPTIONS.slice(0, 4) });

    const parsed = JSON.parse(content);
    const recommended = (parsed.genres || []).slice(0, 4);
    const filtered = GENRE_OPTIONS.filter(g => recommended.includes(g.name));

    return Response.json({ genres: filtered.length > 0 ? filtered : GENRE_OPTIONS.slice(0, 4) });
  } catch {
    return Response.json({ genres: GENRE_OPTIONS.slice(0, 4) });
  }
}
