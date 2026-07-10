"use client";

// components/author/StyleJournal.tsx
// 风格日志 —— 以时间线布局展示编辑器对作者风格的定性观察笔记。

interface StyleJournalEntry {
  date: string;
  title: string;
  content: string;
}

interface StyleJournalProps {
  entries: StyleJournalEntry[];
}

export default function StyleJournal({ entries }: StyleJournalProps) {
  // ── 空状态 ──
  if (!entries || entries.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--bg-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "var(--text-tertiary)",
          }}
        >
          📖
        </div>
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-tertiary)",
            textAlign: "center",
            maxWidth: 220,
            lineHeight: 1.6,
          }}
        >
          写完并保存后，风格日志会自动生成
        </span>
      </div>
    );
  }

  // ── 时间线 ──
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: "0 4px",
      }}
    >
      {entries.map((entry, i) => {
        const dateLabel = formatDate(entry.date);
        const isLast = i === entries.length - 1;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              position: "relative",
            }}
          >
            {/* ── 时间线轴线 ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
                width: 16,
              }}
            >
              {/* 圆点 */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: i === 0 ? "var(--gold)" : "var(--border)",
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />
              {/* 连线 */}
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: "var(--border-light)",
                    marginTop: 4,
                  }}
                />
              )}
            </div>

            {/* ── 日志卡片 ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                paddingBottom: isLast ? 0 : 20,
              }}
            >
              {/* 日期 */}
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {dateLabel}
              </span>

              {/* 文档标题 */}
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 500,
                }}
              >
                {entry.title}
              </span>

              {/* 日志正文 —— 使用 var(--font-body) 呈现散文质感 */}
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                {entry.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 日期格式化辅助 ──
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  } catch {
    return iso;
  }
}
