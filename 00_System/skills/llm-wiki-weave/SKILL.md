---
name: llm-wiki-weave
description: 为 Karpathy 风格 LLM Wiki 做跨来源关系编织。用户要求发现不同 Raw、Source Card、Concept、Entity、Synthesis 之间的联系，建立知识图谱，补充关联来源、关联概念、应用案例、对比、支持、反例、方法补充，或让多篇资料在 wiki 中形成网络时使用。
---

# LLM Wiki 关系编织

## 目标

把已经 ingest 进来的资料互相连接起来。这个 skill 不负责吃新 Raw，而是让不同来源、概念和应用案例在 `20_Wiki/` 中形成更强的知识图谱。

## 适用场景

- 同一主题下有多篇视频、文章、书摘、课程笔记。
- 用户想知道不同博主、不同资料之间的关系。
- 某个概念页已有多个来源，但缺少应用案例和综合关系。
- `Sources/` 中的来源卡片彼此孤立。
- 需要更新或新建 `Syntheses/` 综合页。

## 关系类型

优先使用这些低风险关系标签：

- 同主题：讨论同一个概念或问题。
- 支持：一个来源支持另一个来源的观点。
- 对比：两个来源给出不同方法、工具、路线或视角。
- 应用案例：来源展示某概念的具体使用场景。
- 方法补充：来源补齐了另一个来源没有讲清的步骤。
- 反例/风险：来源展示限制、失败案例、风险或边界条件。
- 待验证：关系可能存在，但证据不足。

不要过度推断。证据不足时写入“待验证”，或放入 `30_Questions/open-questions.md`。

## 工作流

1. 读取 `AGENTS.md`，遵守本库规则。
2. 读取 `90_Manifests/source-index.csv` 和 `90_Manifests/weave-relations.csv`。这是默认入口，不要先读全库正文。
3. 由索引确定本轮范围：用户指定主题、共同 topics、共同 concepts、共同 applications、共同 entities、最近新增来源，或未编织来源。
4. 从索引中选出候选来源，通常 3-8 个；候选过多时只处理最相关的一批。
5. 只读取候选来源卡片和少量相关 `Concepts/`、`Syntheses/` 页面。
6. 识别共同概念、共同实体、共同问题、共同应用场景。
7. 生成候选关系清单，先判断哪些是低风险可写入关系。
8. 更新来源卡片中的 `关联来源`、`关联概念`、`应用案例`。
9. 更新概念页中的 `相关来源`、`应用案例`、`来源关系`。
10. 必要时更新或新建 `Syntheses/` 综合页。
11. 将确定关系登记到 `90_Manifests/weave-relations.csv`。
12. 把不确定关系写入 `30_Questions/open-questions.md`。
13. 按日期分段规则更新 `20_Wiki/log.md`。

## 上下文预算

禁止为了 weave 全量读取 `10_Raw/` 或 `20_Wiki/`。

默认只读：

- `AGENTS.md`
- `90_Manifests/source-index.csv`
- `90_Manifests/weave-relations.csv`
- 必要时读 `20_Wiki/index.md`

候选确定后，每轮最多精读：

- 8 个来源卡片。
- 6 个概念或实体页面。
- 3 个综合页。

每轮最多写入 10 条关系。更多关系作为“下一批候选”列出，等下一轮处理。

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

## 候选发现

从 `source-index.csv` 中按这些字段匹配：

- `topics`
- `entities`
- `concepts`
- `applications`
- `methods`
- `summary`

优先级：

1. 用户明确指定的主题、来源或应用场景。
2. `applications` 相同的来源，例如 `电商图`、`海报`、`角色一致性`。
3. `concepts` 相同的来源，例如 `提示词结构`、`风格控制`。
4. `entities` 相同的来源，例如同一个工具、模型、博主。
5. 最近新增且尚未出现在 `weave-relations.csv` 的来源。

只有候选进入本轮后，才读取对应来源卡片正文。

## 关系登记表

使用 `90_Manifests/weave-relations.csv` 记录已确认关系。

表头：

```csv
from,type,to,evidence,confidence,updated,notes
```

关系确定后写入此表，减少下次重复推理。

## 推荐写入格式

来源卡片中可加入：

```markdown
## 关联来源

- [[来源A]]：同主题，偏提示词结构。
- [[来源B]]：方法补充，提供本地工作流。
- [[来源C]]：应用案例，展示电商主图生成。

## 关联概念

- [[文生图提示词]]
- [[图像风格控制]]

## 应用案例

- 电商主图：说明如何从商品图生成营销素材。
- 角色一致性：说明如何保持人物或 IP 连续。
```

概念页中可加入：

```markdown
## 来源关系

- [[来源A]]：提出概念框架。
- [[来源B]]：补充操作流程。
- [[来源C]]：提供应用案例。

## 应用案例

- [[来源C]]：电商主图生成。
```

综合页中可加入：

```markdown
## 路线图

### 1. 概念层

### 2. 方法层

### 3. 工具层

### 4. 应用案例
```

## 完成后

说明：

- 新增或更新了哪些关系。
- 更新了哪些 Source、Concept、Synthesis 页面。
- 哪些关系是待验证的。
- 是否建议下一轮 ingest 或 health。
