import type { MasterQuote } from "@/types/editor";

const MASTER_QUOTES: MasterQuote[] = [
  // ── 悲伤 / Sorrow ──
  {
    text: "此去经年，应是良辰好景虚设。便纵有千种风情，更与何人说？",
    author: "柳永",
    source: "雨霖铃",
    keywords: ["离别", "思念", "时光", "孤独"],
    tone: "悲伤",
  },
  {
    text: "人生若只如初见，何事秋风悲画扇。",
    author: "纳兰性德",
    source: "木兰花令",
    keywords: ["遗憾", "爱情", "追忆", "变迁"],
    tone: "悲伤",
  },
  {
    text: "十年生死两茫茫，不思量，自难忘。",
    author: "苏轼",
    source: "江城子",
    keywords: ["怀念", "死亡", "时光", "爱情"],
    tone: "悲伤",
  },
  {
    text: "问君能有几多愁？恰似一江春水向东流。",
    author: "李煜",
    source: "虞美人",
    keywords: ["忧愁", "亡国", "思念", "无奈"],
    tone: "悲伤",
  },
  {
    text: "花自飘零水自流。一种相思，两处闲愁。",
    author: "李清照",
    source: "一剪梅",
    keywords: ["思念", "离别", "孤独", "自然"],
    tone: "悲伤",
  },
  {
    text: "夕阳西下，断肠人在天涯。",
    author: "马致远",
    source: "天净沙·秋思",
    keywords: ["孤独", "漂泊", "乡愁", "黄昏"],
    tone: "悲伤",
  },
  {
    text: "此情可待成追忆，只是当时已惘然。",
    author: "李商隐",
    source: "锦瑟",
    keywords: ["追忆", "遗憾", "爱情", "迷惘"],
    tone: "悲伤",
  },
  {
    text: "无可奈何花落去，似曾相识燕归来。",
    author: "晏殊",
    source: "浣溪沙",
    keywords: ["时光", "无奈", "变迁", "自然"],
    tone: "悲伤",
  },

  // ── 喜悦 / Joy ──
  {
    text: "春风得意马蹄疾，一日看尽长安花。",
    author: "孟郊",
    source: "登科后",
    keywords: ["成功", "喜悦", "春天", "得意"],
    tone: "喜悦",
  },
  {
    text: "白日放歌须纵酒，青春作伴好还乡。",
    author: "杜甫",
    source: "闻官军收河南河北",
    keywords: ["喜悦", "归乡", "庆祝", "自由"],
    tone: "喜悦",
  },
  {
    text: "稻花香里说丰年，听取蛙声一片。",
    author: "辛弃疾",
    source: "西江月",
    keywords: ["丰收", "喜悦", "田园", "自然"],
    tone: "喜悦",
  },
  {
    text: "最是一年春好处，绝胜烟柳满皇都。",
    author: "韩愈",
    source: "早春呈水部张十八员外",
    keywords: ["春天", "美景", "喜悦", "赞美"],
    tone: "喜悦",
  },
  {
    text: "你若爱，生活哪里都可爱。你若恨，生活哪里都可恨。",
    author: "丰子恺",
    source: "豁然开朗",
    keywords: ["生活", "态度", "喜悦", "豁达"],
    tone: "喜悦",
  },
  {
    text: "世界上只有一种真正的英雄主义，那就是在认清生活真相后依然热爱生活。",
    author: "罗曼·罗兰",
    source: "米开朗基罗传",
    keywords: ["生活", "勇气", "热爱", "坚韧"],
    tone: "喜悦",
  },

  // ── 思念 / Longing ──
  {
    text: "但愿人长久，千里共婵娟。",
    author: "苏轼",
    source: "水调歌头",
    keywords: ["思念", "月亮", "祝福", "远方"],
    tone: "思念",
  },
  {
    text: "红豆生南国，春来发几枝。愿君多采撷，此物最相思。",
    author: "王维",
    source: "相思",
    keywords: ["思念", "爱情", "自然", "远方"],
    tone: "思念",
  },
  {
    text: "独在异乡为异客，每逢佳节倍思亲。",
    author: "王维",
    source: "九月九日忆山东兄弟",
    keywords: ["乡愁", "思念", "孤独", "节日"],
    tone: "思念",
  },
  {
    text: "我住长江头，君住长江尾。日日思君不见君，共饮长江水。",
    author: "李之仪",
    source: "卜算子",
    keywords: ["思念", "爱情", "距离", "江水"],
    tone: "思念",
  },
  {
    text: "今夜月明人尽望，不知秋思落谁家。",
    author: "王建",
    source: "十五夜望月",
    keywords: ["思念", "秋天", "月亮", "孤独"],
    tone: "思念",
  },
  {
    text: "露从今夜白，月是故乡明。",
    author: "杜甫",
    source: "月夜忆舍弟",
    keywords: ["乡愁", "思念", "月亮", "兄弟"],
    tone: "思念",
  },

  // ── 豪迈 / Heroic ──
  {
    text: "大鹏一日同风起，扶摇直上九万里。",
    author: "李白",
    source: "上李邕",
    keywords: ["壮志", "自由", "豪迈", "飞翔"],
    tone: "豪迈",
  },
  {
    text: "长风破浪会有时，直挂云帆济沧海。",
    author: "李白",
    source: "行路难",
    keywords: ["信念", "奋斗", "豪迈", "海洋"],
    tone: "豪迈",
  },
  {
    text: "会当凌绝顶，一览众山小。",
    author: "杜甫",
    source: "望岳",
    keywords: ["壮志", "攀登", "豪迈", "视野"],
    tone: "豪迈",
  },
  {
    text: "人生自古谁无死，留取丹心照汗青。",
    author: "文天祥",
    source: "过零丁洋",
    keywords: ["牺牲", "忠诚", "豪迈", "历史"],
    tone: "豪迈",
  },
  {
    text: "醉里挑灯看剑，梦回吹角连营。",
    author: "辛弃疾",
    source: "破阵子",
    keywords: ["战争", "壮志", "回忆", "豪迈"],
    tone: "豪迈",
  },
  {
    text: "黄河之水天上来，奔流到海不复回。",
    author: "李白",
    source: "将进酒",
    keywords: ["壮阔", "自然", "豪迈", "时光"],
    tone: "豪迈",
  },
  {
    text: "生当作人杰，死亦为鬼雄。",
    author: "李清照",
    source: "夏日绝句",
    keywords: ["英雄", "气节", "豪迈", "生死"],
    tone: "豪迈",
  },

  // ── 沉静 / Serenity ──
  {
    text: "大漠孤烟直，长河落日圆。",
    author: "王维",
    source: "使至塞上",
    keywords: ["孤独", "壮阔", "自然", "沉静"],
    tone: "沉静",
  },
  {
    text: "空山新雨后，天气晚来秋。",
    author: "王维",
    source: "山居秋暝",
    keywords: ["自然", "秋天", "宁静", "山"],
    tone: "沉静",
  },
  {
    text: "采菊东篱下，悠然见南山。",
    author: "陶渊明",
    source: "饮酒",
    keywords: ["田园", "隐逸", "宁静", "自然"],
    tone: "沉静",
  },
  {
    text: "行到水穷处，坐看云起时。",
    author: "王维",
    source: "终南别业",
    keywords: ["随遇而安", "自然", "沉静", "禅意"],
    tone: "沉静",
  },
  {
    text: "千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。",
    author: "柳宗元",
    source: "江雪",
    keywords: ["孤独", "冬天", "沉静", "坚守"],
    tone: "沉静",
  },
  {
    text: "明月松间照，清泉石上流。",
    author: "王维",
    source: "山居秋暝",
    keywords: ["自然", "宁静", "月光", "水"],
    tone: "沉静",
  },
  {
    text: "宠辱不惊，看庭前花开花落；去留无意，望天上云卷云舒。",
    author: "陈继儒",
    source: "小窗幽记",
    keywords: ["豁达", "沉静", "自然", "人生"],
    tone: "沉静",
  },
  {
    text: "人闲桂花落，夜静春山空。",
    author: "王维",
    source: "鸟鸣涧",
    keywords: ["宁静", "春天", "自然", "夜晚"],
    tone: "沉静",
  },

  // ── 激昂 / Passionate ──
  {
    text: "仰天大笑出门去，我辈岂是蓬蒿人。",
    author: "李白",
    source: "南陵别儿童入京",
    keywords: ["自信", "豪迈", "激昂", "抱负"],
    tone: "激昂",
  },
  {
    text: "安能摧眉折腰事权贵，使我不得开心颜！",
    author: "李白",
    source: "梦游天姥吟留别",
    keywords: ["自由", "反抗", "激昂", "尊严"],
    tone: "激昂",
  },
  {
    text: "壮志饥餐胡虏肉，笑谈渴饮匈奴血。",
    author: "岳飞",
    source: "满江红",
    keywords: ["战争", "爱国", "激昂", "仇恨"],
    tone: "激昂",
  },
  {
    text: "了却君王天下事，赢得生前身后名。",
    author: "辛弃疾",
    source: "破阵子",
    keywords: ["功名", "壮志", "激昂", "忠诚"],
    tone: "激昂",
  },
  {
    text: "我自横刀向天笑，去留肝胆两昆仑。",
    author: "谭嗣同",
    source: "狱中题壁",
    keywords: ["牺牲", "革命", "激昂", "无畏"],
    tone: "激昂",
  },
  {
    text: "天生我材必有用，千金散尽还复来。",
    author: "李白",
    source: "将进酒",
    keywords: ["自信", "豪迈", "激昂", "豁达"],
    tone: "激昂",
  },

  // ── 现代文学 / Modern ──
  {
    text: "世间所有的相遇，都是久别重逢。",
    author: "白落梅",
    source: "你若安好便是晴天",
    keywords: ["相遇", "缘分", "思念", "温暖"],
    tone: "思念",
  },
  {
    text: "我们终此一生，就是要摆脱他人的期待，找到真正的自己。",
    author: "伍绮诗",
    source: "无声告白",
    keywords: ["自我", "成长", "自由", "人生"],
    tone: "沉静",
  },
  {
    text: "活着本身就是一种幸运，能够思考更是一种幸福。",
    author: "余华",
    source: "活着",
    keywords: ["生命", "感恩", "思考", "坚韧"],
    tone: "沉静",
  },
  {
    text: "记忆是相会的一种形式，忘记是自由的一种形式。",
    author: "纪伯伦",
    source: "沙与沫",
    keywords: ["记忆", "自由", "时光", "哲思"],
    tone: "沉静",
  },
  {
    text: "每一个不曾起舞的日子，都是对生命的辜负。",
    author: "尼采",
    source: "查拉图斯特拉如是说",
    keywords: ["生命", "热情", "激昂", "珍惜"],
    tone: "激昂",
  },
  {
    text: "一个人可以被毁灭，但不能被打败。",
    author: "海明威",
    source: "老人与海",
    keywords: ["坚韧", "抗争", "勇气", "失败"],
    tone: "激昂",
  },
  {
    text: "人生的意义不在于拿一手好牌，而在于打好一手烂牌。",
    author: "兰迪·鲍许",
    source: "最后一课",
    keywords: ["人生", "坚持", "智慧", "态度"],
    tone: "喜悦",
  },
  {
    text: "如果你因失去了太阳而流泪，那么你也将失去群星了。",
    author: "泰戈尔",
    source: "飞鸟集",
    keywords: ["失去", "希望", "豁达", "哲思"],
    tone: "悲伤",
  },
];

/**
 * Match master quotes against keywords and emotional tone.
 * Returns top 2 matching quotes ranked by keyword overlap + tone match.
 */
export function matchMasterQuotes(
  keywords: string[],
  tone: string
): MasterQuote[] {
  if (!keywords.length) {
    // Return random quotes if no keywords provided
    const shuffled = [...MASTER_QUOTES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }

  const scored = MASTER_QUOTES.map((quote) => {
    let score = 0;

    // Keyword overlap: each matching keyword adds 2 points
    for (const kw of keywords) {
      for (const qk of quote.keywords) {
        if (qk.includes(kw) || kw.includes(qk)) {
          score += 2;
        }
      }
    }

    // Tone match: exact match adds 3 points
    if (quote.tone === tone) {
      score += 3;
    }

    // Bonus for partial tonal affinity
    const relatedTones: Record<string, string[]> = {
      "悲伤": ["思念"],
      "思念": ["悲伤"],
      "豪迈": ["激昂"],
      "激昂": ["豪迈"],
      "沉静": ["喜悦"],
      "喜悦": ["沉静"],
    };

    if (relatedTones[tone]?.includes(quote.tone)) {
      score += 1;
    }

    return { quote, score };
  });

  // Sort by score descending, take top 2 (or all if fewer)
  scored.sort((a, b) => b.score - a.score);

  // If top score is 0, return random 2
  if (scored[0]?.score === 0) {
    const shuffled = [...MASTER_QUOTES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }

  return scored.slice(0, 2).map((s) => s.quote);
}
