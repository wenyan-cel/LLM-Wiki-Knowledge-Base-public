# Agent Instructions

你正在维护一个 Obsidian Markdown 知识库。请把它当作长期演化的 wiki，而不是一次性摘要仓库。

## 目录角色

- `10_Raw/`: 原始资料区。只添加、命名、引用，不要在这里重写内容。
- `20_Wiki/`: 编译后的知识区。这里的页面要持续合并、纠错、去重、链接。
- `20_Wiki/Concepts/`: 概念、方法、理论、模式。
- `20_Wiki/Entities/`: 人、组织、项目、产品、地点。
- `20_Wiki/Sources/`: 来源卡片，记录每个重要来源的元数据、要点、引用位置。
- `20_Wiki/Syntheses/`: 跨来源综合、比较、路线图。
- `30_Questions/`: 仍不确定、需要验证、值得继续研究的问题。
- `40_Outputs/`: 从知识库生成的文章、报告、清单、演讲稿。
- `90_Manifests/`: 来源清单、术语表、维护清单等机器可读辅助文件。
- `90_Manifests/source-index.csv`: 每个来源的轻量语义索引，供搜索和关系编织时低成本定位候选。
- `90_Manifests/weave-relations.csv`: 已确认的跨来源关系登记表，避免重复推理。

## 写作规则

1. 优先更新已有 wiki 页；只有出现新的稳定主题时才新建页面。
2. 每个 wiki 页面尽量回答一个主题，不要堆成杂物箱。
3. 用双链连接相关页面，例如 `[[LLM Wiki]]`。
4. 明确区分事实、推论、个人理解和待验证内容。
5. 来源相关内容要链接到 `20_Wiki/Sources/` 中的来源卡片。
6. 不要把大段原文复制进 wiki；短引用可以保留，但主要做压缩、重组和归纳。
7. 每次实质更新后，在 `20_Wiki/log.md` 加一条记录。
8. 本知识库默认使用中文维护；除非来源标题、专有名词或用户明确要求保留外文。

## 可用 Skills

- `llm-wiki-ingest`: 将 `10_Raw/` 或用户指定资料编译进 `20_Wiki/`。
- `llm-wiki-weave`: 发现不同来源、概念、应用案例之间的联系，增强 wiki 知识图谱。
- `llm-wiki-search`: 基于 `20_Wiki/index.md` 和 wiki 双链进行搜索问答。
- `llm-wiki-health`: 定期检查重复页面、孤立页面、断链、来源缺口、索引缺口和开放问题。

这些 skills 的随库副本位于 `00_System/skills/`。换电脑使用时，将这些文件夹复制到新电脑的 Codex skills 目录，例如 `C:\Users\<用户名>\.codex\skills\`。

## 页面格式

建议每个概念页包含：

- `一句话定义`
- `为什么重要`
- `核心要点`
- `实践方法`
- `相关页面`
- `来源`
- `待验证`

## 更新流程

1. 读 `20_Wiki/index.md` 和相关页面，先理解现有结构。
2. 读取或登记新来源。
3. 判断应该更新哪些现有页面，哪些主题需要新建。
4. 修改 wiki 页面并补链接。
5. 更新来源卡片。
6. 更新 `20_Wiki/log.md`。
7. 把未解决问题写入 `30_Questions/open-questions.md`。

## Change Log 规则

`20_Wiki/log.md` 必须按日期分段维护。

格式：

```markdown
## YYYY-MM-DD

- Added:
- Updated:
- Fixed:
- Open questions:
```

规则：

1. 新记录必须写入当前日期对应的小节。
2. 如果当天小节不存在，在 `# Change Log` 下方新建当天小节。
3. 不要把今天的更新追加到旧日期下面。
4. 每条记录只描述一个实质变更。
5. 可以使用 `Added`、`Updated`、`Fixed`、`Removed`、`Open questions` 前缀。
6. 修改日志后，同步更新 frontmatter 的 `updated` 日期。

## 搜索问答流程

当用户询问知识库已有内容、要求总结某主题、查找笔记、基于 wiki 回答问题时：

1. 先读 `20_Wiki/index.md`，从索引判断问题属于哪些主题。
2. 读取索引命中的相关页面。
3. 沿这些页面中的双链读取一跳相关页面，尤其是 `Sources/`、`Concepts/`、`Syntheses/`。
4. 若索引没有命中，再用全文搜索在 `20_Wiki/` 中查关键词、同义词、英文名和缩写。
5. 若仍不足，再搜索 `90_Manifests/` 和 `10_Raw/` 做溯源。
6. 回答时优先引用 wiki 页面；涉及事实来源时指出来源卡片或 raw 来源。
7. 若答案有长期复用价值，建议或执行写回 wiki。

回答必须区分：

- 知识库已有内容。
- 基于已有内容的推论。
- 知识库暂时缺失、需要补充 ingest 的资料。

## 入库流程

当用户把新资料放入 `10_Raw/`，或指定网页、PDF、书摘、聊天记录、课程笔记时：

1. 在 `90_Manifests/sources.csv` 检查是否已登记。
2. 若未登记，添加来源记录。
3. 在 `20_Wiki/Sources/` 创建或更新来源卡片。
4. 在 `90_Manifests/source-index.csv` 写入或更新轻量语义索引，字段包括 topics、entities、concepts、applications、methods、summary。
5. 提取会影响长期知识库的内容：概念、实体、关系、方法、冲突、问题。
6. 优先更新已有 `Concepts/`、`Entities/`、`Syntheses/` 页面。
7. 只有出现稳定且可复用的新主题时才新建页面。
8. 补充 Obsidian 双链。
9. 把不确定、待验证、资料冲突写入 `30_Questions/open-questions.md`。
10. 更新 `20_Wiki/index.md` 中的稳定入口。
11. 按 “Change Log 规则” 更新 `20_Wiki/log.md`。

## 关系编织流程

当用户要求建立不同 Raw、Source、Concept、Entity、Synthesis 之间的联系，或要求增强知识图谱时：

1. 先读取 `90_Manifests/source-index.csv` 和 `90_Manifests/weave-relations.csv`。
2. 由索引确定本轮范围：用户指定主题、共同 topics、共同 concepts、共同 applications、共同 entities、最近新增来源，或未编织来源。
3. 禁止为了 weave 全量读取 `10_Raw/` 或 `20_Wiki/`。
4. 从索引中选出候选来源，通常 3-8 个；候选过多时只处理最相关的一批。
5. 只读取候选来源卡片和少量相关 `Concepts/`、`Syntheses/` 页面。
6. 识别共同概念、共同实体、共同问题、共同应用场景。
7. 使用低风险关系标签：同主题、支持、对比、应用案例、方法补充、反例/风险、待验证。
8. 更新来源卡片中的 `关联来源`、`关联概念`、`应用案例`。
9. 更新概念页中的 `来源关系`、`应用案例`、`相关来源`。
10. 必要时更新或新建 `Syntheses/` 综合页。
11. 将确定关系写入 `90_Manifests/weave-relations.csv`。
12. 证据不足的关系写入 `30_Questions/open-questions.md`。
13. 按 “Change Log 规则” 更新 `20_Wiki/log.md`。

不要过度推断。关系必须能从来源卡片、概念页或原始资料中找到依据。每轮最多精读 15 个页面，最多写入 10 条关系。

## 健康维护流程

定期检查：

- 重复页面：同一概念是否有多个标题。
- 孤立页面：没有进入索引、没有入链或出链。
- 断链：双链指向不存在页面。
- 来源缺口：有事实但没有来源卡或 `sources.csv` 记录。
- 日志缺口：实质更新没有写入 `20_Wiki/log.md`。
- 索引缺口：稳定页面没有出现在 `20_Wiki/index.md`。
- 问题堆积：`open-questions.md` 中已可回答的问题没有关闭或回写。
- 页面膨胀：页面太长、主题混杂，需要拆分或重组。

低风险修复可以直接做：补链接、补索引、补来源、补日志、修正明显命名问题。合并、删除、大幅重写页面前，先给出建议。

## 来源卡片格式

```markdown
---
type: source
status: seed
updated: YYYY-MM-DD
author:
url:
---

# 来源标题

## 元数据

## 可吸收观点

## 已更新的 Wiki 页面

## 关键引用

## 待验证
```

## sources.csv 表头

```csv
id,title,author,url_or_path,date,type,status,notes
```

## source-index.csv 表头

```csv
id,title,path,raw_path,type,date,status,topics,entities,concepts,applications,methods,summary
```

## weave-relations.csv 表头

```csv
from,type,to,evidence,confidence,updated,notes
```
