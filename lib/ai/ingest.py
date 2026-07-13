"""
Knowledge Ingestion Pipeline — imports Sculptor's Knowledge Hub into the vector store.
Supports both mock knowledge (from knowledge-hub.ts) and real document sources.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Ensure project root is in Python path
_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from lib.ai.vector_store import VectorStore, KnowledgeItem, get_vector_store


# ── Mock Knowledge Import ──────────────────────────────────────

# This mirrors the KNOWLEDGE_BASE from knowledge-hub.ts
# In production, this data would come from a database or file ingestion pipeline
MOCK_KNOWLEDGE_ITEMS = [
    # HCI / 产品设计
    {"text": "Apple Human Interface Guidelines 强调减少认知负担是其核心设计原则，每个界面都应让用户无需思考即可操作。", "source": "Apple HIG", "domain": "HCI/产品设计", "confidence": 0.95},
    {"text": "Google Material Design 3 引入了动态色彩系统，根据用户壁纸自动生成配色方案，体现了个性化与一致性的平衡。", "source": "Material Design 3", "domain": "HCI/产品设计", "confidence": 0.90},
    {"text": "Nielsen Norman Group 研究指出，用户平均只阅读网页上 20% 的文字内容，因此界面设计应优先呈现最重要的信息。", "source": "NN/g Research", "domain": "HCI/产品设计", "confidence": 0.92},
    {"text": "Fitts's Law 指出，目标的大小和距离决定了用户到达目标的时间，这直接影响了按钮和交互元素的布局设计。", "source": "Fitts's Law (1954)", "domain": "HCI/产品设计", "confidence": 0.88},
    {"text": "对话式用户界面（CUI）的设计原则强调：系统应清晰表达自己的能力边界，避免让用户猜测可以说什么。", "source": "Microsoft CUI Guidelines", "domain": "HCI/产品设计", "confidence": 0.85},
    {"text": "Notion 的设计哲学是'一切皆块'，这种原子化的信息组织方式降低了用户组织复杂信息的认知门槛。", "source": "Notion Design Blog", "domain": "HCI/产品设计", "confidence": 0.82},
    {"text": "Cursor 编辑器通过将 AI 深度嵌入代码编辑流程而非独立对话窗口，证明了非聊天式 AI 交互的可行性。", "source": "Cursor Blog 2024", "domain": "HCI/产品设计", "confidence": 0.87},
    {"text": "WCAG 2.2 无障碍标准要求所有交互元素至少 44x44 CSS 像素的触摸目标，这对移动端设计具有重要指导意义。", "source": "W3C WCAG 2.2", "domain": "HCI/产品设计", "confidence": 0.93},

    # AI / 技术
    {"text": "GPT-4 技术报告指出，大型语言模型通过 RLHF（人类反馈强化学习）显著提升了对齐性和有用性。", "source": "OpenAI GPT-4 Technical Report", "domain": "AI/技术", "confidence": 0.92},
    {"text": "Anthropic 的 Claude 模型采用 Constitutional AI 方法，通过自监督的方式使模型行为与人类价值观对齐。", "source": "Anthropic Research", "domain": "AI/技术", "confidence": 0.90},
    {"text": "Chain-of-Thought 提示技术被证明可以显著提高 LLM 在复杂推理任务上的表现，尤其是在数学和逻辑问题中。", "source": "Wei et al., 2022, NeurIPS", "domain": "AI/技术", "confidence": 0.94},
    {"text": "RAG（检索增强生成）架构通过将外部知识库与生成模型结合，有效减少了 LLM 的事实性错误。", "source": "Lewis et al., 2020, NeurIPS", "domain": "AI/技术", "confidence": 0.91},
    {"text": "Mixture of Experts (MoE) 架构使模型在推理时只激活部分参数，在保持性能的同时大幅降低了计算成本。", "source": "Shazeer et al., 2017, ICLR", "domain": "AI/技术", "confidence": 0.89},
    {"text": "Transformer 架构中的自注意力机制使得模型能够捕捉长距离依赖关系，这是其优于 RNN 的关键原因。", "source": "Vaswani et al., 2017, NeurIPS", "domain": "AI/技术", "confidence": 0.96},
    {"text": "DeepSeek-V2 通过 Multi-head Latent Attention (MLA) 技术，将 KV 缓存压缩至原来的 1/5，大幅降低了推理成本。", "source": "DeepSeek-V2 Technical Report", "domain": "AI/技术", "confidence": 0.88},
    {"text": "大多数 AI 产品选择聊天界面并非因为它是用户体验最优解，而是因为 LLM 的 API 天然设计为对话接口。", "source": "a16z AI UX Report 2024", "domain": "AI/技术", "confidence": 0.83},
    {"text": "AI 产品的同质化趋势源于三个因素：模型能力趋同、用户预期已形成、探索新交互范式的商业风险太高。", "source": "MIT Technology Review 2024", "domain": "AI/技术", "confidence": 0.80},

    # 教育
    {"text": "芬兰教育模式的核心特点是：减少标准化测试、增加教师自主权、强调跨学科项目式学习、延迟学术分轨至16岁。", "source": "OECD Education at a Glance 2024", "domain": "教育", "confidence": 0.91},
    {"text": "Bloom's 2-Sigma 问题指出，一对一辅导可以将学生成绩提升两个标准差，但大规模实现这一目标一直是教育技术的圣杯。", "source": "Bloom, 1984, Educational Researcher", "domain": "教育", "confidence": 0.93},
    {"text": "研究表明，间隔重复（Spaced Repetition）比集中学习效率高 200%，这一发现正在被 AI 自适应学习系统广泛采用。", "source": "Cepeda et al., 2006, Psychological Bulletin", "domain": "教育", "confidence": 0.90},
    {"text": "认知负荷理论指出，工作记忆容量有限（约4±1个信息块），教学设计应将复杂内容分解为可管理的组块。", "source": "Sweller, 1988, Cognitive Science", "domain": "教育", "confidence": 0.92},
    {"text": "生成式 AI 在教育中的应用引发了关于学术诚信的广泛讨论，但研究表明合理使用 AI 作为写作助手可将学生论文质量提升 18%。", "source": "Stanford HAI Education Report 2024", "domain": "教育", "confidence": 0.82},

    # 社会 / 文化
    {"text": "TikTok 的推荐算法与 Instagram 的根本性差异在于：前者以内容为中心，后者以社交关系为中心。", "source": "The Information, 2023", "domain": "社会/文化", "confidence": 0.78},
    {"text": "皮尤研究中心 2024 年报告显示，64% 的美国成年人认为社交媒体对民主制度产生了负面影响。", "source": "Pew Research Center 2024", "domain": "社会/文化", "confidence": 0.90},
    {"text": "信息茧房效应并非由算法单独造成，用户的主动选择性接触（selective exposure）是同等重要的因素。", "source": "Bakshy et al., 2015, Science", "domain": "社会/文化", "confidence": 0.87},
    {"text": "数字鸿沟已从'是否接入互联网'演变为'如何使用互联网'——技能差异比接入差异更能预测数字时代的成功。", "source": "World Bank Digital Development Report 2024", "domain": "社会/文化", "confidence": 0.85},
    {"text": "注意力经济学指出，在信息过载时代，最稀缺的资源不是信息，而是用户的注意力——这重塑了所有数字产品的设计逻辑。", "source": "Simon, 1971; Newport, 2019", "domain": "社会/文化", "confidence": 0.88},

    # 哲学
    {"text": "柏拉图在《理想国》第七卷中提出洞穴比喻，描述人类如何被困于对现实的不完整认知中，需要哲学引导才能看到真相。", "source": "Plato, Republic Book VII", "domain": "哲学", "confidence": 0.95},
    {"text": "海德格尔提出'技术的本质不是技术性的'（The Question Concerning Technology），认为技术是一种'解蔽'世界的方式，而非中立的工具。", "source": "Heidegger, 1954", "domain": "哲学", "confidence": 0.88},
    {"text": "杜威在《民主与教育》中指出，教育不仅是知识的传递，更是经验的持续重组——这与 Sculptor 的认知成长理念高度一致。", "source": "Dewey, Democracy and Education, 1916", "domain": "哲学", "confidence": 0.85},
    {"text": "AI 对齐问题的哲学根源可以追溯到休谟的'是-应该问题'：从事实描述无法直接推导出价值判断。", "source": "Hume, A Treatise of Human Nature, 1739", "domain": "哲学", "confidence": 0.90},

    # 历史
    {"text": "工业革命不仅改变了生产方式，更从根本上改变了人们对'工作'和'学习'的理解——标准化、专业化、效率优先成为核心价值。", "source": "Polanyi, The Great Transformation, 1944", "domain": "历史", "confidence": 0.87},
    {"text": "古登堡印刷术（1440年）使知识的传播从手抄本转向大规模复制，这是人类历史上最重要的信息民主化事件之一。", "source": "Eisenstein, The Printing Revolution, 1979", "domain": "历史", "confidence": 0.92},

    # 商业
    {"text": "Clayton Christensen 提出的'颠覆性创新'理论认为，创新往往从被主流市场忽视的边缘地带开始，逐步侵蚀既有市场。", "source": "Christensen, The Innovator's Dilemma, 1997", "domain": "商业", "confidence": 0.89},
    {"text": "产品市场匹配（Product-Market Fit）是早期创业公司最重要的里程碑——在找到 PMF 之前，不应大规模投入增长。", "source": "Andreessen Horowitz", "domain": "商业", "confidence": 0.85},

    # 写作
    {"text": "Strunk & White 的《风格的要素》第一条原则就是'省略不必要的词'——这一原则与 UI 设计中'减少认知负担'的理念高度吻合。", "source": "Strunk & White, The Elements of Style", "domain": "写作", "confidence": 0.90},
    {"text": "芝加哥格式手册（CMOS）是学术写作的黄金标准，提供从引用格式到标点使用的最权威指导。", "source": "The Chicago Manual of Style, 18th Edition", "domain": "写作", "confidence": 0.93},
    {"text": "研究发现，写作过程中的认知负荷主要来自三个方面：内容生成、结构组织、语言表达——优秀的写作工具应逐一减轻这些负担。", "source": "Flower & Hayes, 1981, Cognitive Science", "domain": "写作", "confidence": 0.88},

    # Additional AI/产品 items
    {"text": "Perplexity AI 通过将搜索与 LLM 深度集成，证明了 AI 产品不一定需要对话式交互——搜索框 + 结构化结果也可以是有效范式。", "source": "Perplexity AI Blog 2024", "domain": "AI/技术", "confidence": 0.84},
    {"text": "Apple Intelligence 的策略是将 AI 能力深度集成到操作系统层级而非独立 App，体现了'AI 应该不可见'的设计哲学。", "source": "Apple WWDC 2024 Keynote", "domain": "AI/技术", "confidence": 0.86},
]


def ingest_mock_knowledge(store: VectorStore = None) -> int:
    """Import all mock knowledge items into the vector store."""
    if store is None:
        store = get_vector_store()

    items = []
    for k in MOCK_KNOWLEDGE_ITEMS:
        item = KnowledgeItem(
            text=k["text"],
            source=k["source"],
            domain=k["domain"],
            confidence=k["confidence"],
        )
        items.append(item)

    count = store.add_items(items)
    print(f"[Ingest] Imported {count} knowledge items across {len(set(k['domain'] for k in MOCK_KNOWLEDGE_ITEMS))} domains")
    return count


def ingest_json_file(filepath: str, store: VectorStore = None) -> int:
    """Import knowledge items from a JSON file."""
    if store is None:
        store = get_vector_store()

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = []
    for entry in data:
        item = KnowledgeItem(
            text=entry.get("text", entry.get("content", "")),
            source=entry.get("source", "Unknown"),
            domain=entry.get("domain", "general"),
            confidence=entry.get("confidence", 0.8),
            metadata=entry.get("metadata", {}),
        )
        items.append(item)

    count = store.add_items(items)
    print(f"[Ingest] Imported {count} items from {filepath}")
    return count


def search(query: str, k: int = 5, store: VectorStore = None) -> List[Dict[str, Any]]:
    """Search the vector store for relevant knowledge."""
    if store is None:
        store = get_vector_store()
    return store.search(query, k)


# ── CLI ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Sculptor Knowledge Ingestion")
    parser.add_argument("--ingest", action="store_true", help="Ingest mock knowledge into vector store")
    parser.add_argument("--search", type=str, help="Search query")
    parser.add_argument("--stats", action="store_true", help="Show store statistics")
    parser.add_argument("--file", type=str, help="Import from JSON file")
    args = parser.parse_args()

    store = get_vector_store()

    if args.ingest:
        ingest_mock_knowledge(store)
    elif args.file:
        ingest_json_file(args.file, store)
    elif args.search:
        results = search(args.search, store=store)
        for i, r in enumerate(results):
            print(f"\n[{i+1}] Score: {r['confidence']:.3f} | Domain: {r['domain']}")
            print(f"    Source: {r['source']}")
            print(f"    {r['text'][:120]}...")
    elif args.stats:
        stats = store.get_stats()
        print(json.dumps(stats, indent=2, ensure_ascii=False))
    else:
        parser.print_help()
