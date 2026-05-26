---
name: llm-wiki-ingest
description: 将新资料编译进 Karpathy 风格 LLM Wiki。用户要求处理 10_Raw、吸收网页/PDF/书摘/聊天记录/课程笔记、把 raw/source 转成 wiki、创建来源卡片、更新概念页、补双链、维护 sources.csv、log.md 或 open questions 时使用。
---

# LLM Wiki 入库编译

## 目标

把新资料从 Raw 层编译进 Wiki 层。不要只写“本文摘要”，而要把资料更新到相关的长期页面里。

## 工作流

1. 读取 `AGENTS.md`。
2. 读取 `20_Wiki/index.md`、`20_Wiki/log.md`、相关概念页、相关来源卡。
3. 找到待处理资料：用户指定文件、URL，或 `10_Raw/` 中未登记的新文件。
4. 在 `90_Manifests/sources.csv` 中检查是否已登记。
5. 为每个新资料创建或更新 `20_Wiki/Sources/` 来源卡片。
6. 在 `90_Manifests/source-index.csv` 中写入或更新轻量语义索引。
7. 提取会影响长期知识库的内容：概念、实体、关系、方法、冲突、问题。
8. 优先更新已有 `Concepts/`、`Entities/`、`Syntheses/` 页面。
9. 只有出现稳定且可复用的新主题时才新建页面。
10. 补充 Obsidian 双链。
11. 把不确定、待验证、资料冲突写入 `30_Questions/open-questions.md`。
12. 更新 `20_Wiki/index.md` 中的稳定入口。
13. 按日期分段规则更新 `20_Wiki/log.md`。

## 轻量语义索引

每次 ingest 都必须维护 `90_Manifests/source-index.csv`。这是给 `llm-wiki-weave` 和 `llm-wiki-search` 使用的低成本导航层，避免未来为了找关系而通读全库。

表头：

```csv
id,title,path,raw_path,type,date,status,topics,entities,concepts,applications,methods,summary
```

字段要求：

- `id`: 与 `sources.csv` 保持一致。
- `title`: 来源标题。
- `path`: 来源卡片路径，例如 `20_Wiki/Sources/example.md`。
- `raw_path`: 原始资料路径或 URL。
- `type`: article、video、book、chat、course、pdf、note 等。
- `date`: 入库日期或来源日期。
- `status`: seed、ingested、growing、stable、needs-review。
- `topics`: 主题标签，用分号分隔。
- `entities`: 人、组织、工具、产品、模型，用分号分隔。
- `concepts`: 概念标签，用分号分隔。
- `applications`: 应用场景，用分号分隔，例如 `电商图;海报;头像`。
- `methods`: 方法或流程标签，用分号分隔。
- `summary`: 30-80 字轻摘要，只用于候选检索，不替代来源卡。

这个索引不追求完整复述，只追求低成本定位候选关系。

## Change Log 规则

更新 `20_Wiki/log.md` 时必须按日期分段：

```markdown
## YYYY-MM-DD

- Added:
- Updated:
- Fixed:
- Open questions:
```

新记录必须写入当前日期小节；若当天小节不存在，在 `# Change Log` 下方新建。不要把今天的更新追加到旧日期下面。修改后同步更新 frontmatter 的 `updated` 日期。

## 编译标准

- 新资料应进入多个相关页面，而不是孤立成一篇摘要。
- 来源卡片保存资料元数据和可追溯入口。
- 概念页保存综合理解。
- 综合页保存跨来源比较、框架、路线图。
- 保留冲突，不要强行消解；标清各自来源。
- 大段原文不要复制进 Wiki，除非用户明确要求。

## 页面选择

- 已有页面能承接：更新已有页面。
- 主题会反复出现：新建概念页。
- 只是单篇文章：只建来源卡片。
- 是跨资料判断：写入 Syntheses。
- 是未解决问题：写入 Open Questions。

## 完成后

列出：

- 新增或更新的来源卡；
- 新增或更新的 `source-index.csv` 条目；
- 更新了哪些 wiki 页；
- 新建了哪些页面以及原因；
- 仍需用户判断的问题。
