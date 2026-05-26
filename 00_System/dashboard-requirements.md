# LLM Wiki 数据看板需求文档

## 目标

在当前 LLM Wiki 架构下，为 Obsidian 增加一个数据看板插件，用来观察知识库的日常运转状态：

- Raw 输入量是否稳定。
- Raw 是否被转化为 Wiki。
- 每日计划和周目标是否完成。
- 知识库是否存在积压和维护压力。

这个看板不是普通待办软件，而是面向 `Raw -> Wiki -> Output` 工作流的知识生产仪表盘。

## 信息架构

### 统计看板

核心指标：

- 今日新增 Raw。
- 本月新增 Raw。
- Raw 总量。
- Source Card 数量。
- Wiki 转化率。
- 今日任务完成率。
- 本月任务完成率。
- 开放问题数量。

辅助趋势：

- 最近 30 天 Raw 新增柱状图。
- 最近 30 天 Wiki 更新柱状图。
- 图表说明：横轴为最近 30 天日期；纵轴为当天文件数量；黑柱表示 Raw 新增数，红柱表示 Wiki 更新数。

### Plan 看板

支持：

- 制定今日计划。
- 制定本周目标。
- 制定月度目标。
- 制定年度目标。
- 勾选每日任务完成情况。
- 勾选周目标完成情况。
- 勾选月度目标完成情况。
- 勾选年度目标完成情况。
- 任务完成情况同步到统计看板。
- 历史任务看板：以弹窗形式打开，支持日任务/月任务切换。
- 用户可选择起始日期和终止日期，查看该时间段内的任务完成情况。
- 历史任务按时间轴分组展示，显示每一天或每个月的完成数。

任务类型建议：

- `raw`: 收集、整理原始资料。
- `wiki`: 编译或更新 wiki 页面。
- `question`: 处理开放问题。
- `health`: 健康维护。
- `output`: 生成文章、报告、方案等输出。

### 健康提示

MVP 阶段提供轻量提示：

- Raw 总量大于 Source Card 数量时，提示存在待转化资料。
- `30_Questions/open-questions.md` 有未处理项目时，提示开放问题数量。
- 最近 7 天没有 Wiki 更新时，提示知识层可能停滞。

### GitHub 每日发现

支持：

- 用户配置主题关键词，例如 `ai`、`llm`、`agent`。
- 每天自动搜集 GitHub 近 1 天新建的热门开源项目 Top 5。
- 每条项目返回 GitHub 地址和一句话中文简介。
- 一句话简介由 DeepSeek Chat Completions API 生成。
- 支持手动刷新。
- 结果保存到 `90_Manifests/github-daily-top.json`。

注意：

- GitHub Search API 无鉴权时有速率限制。
- DeepSeek API Key 通过插件设置配置。
- API Key 若保存在 Obsidian 插件数据中，打包或同步 vault 时要注意泄露风险。

## 数据来源

- `10_Raw/`: 统计 Raw 文件。
- `20_Wiki/`: 统计 Wiki 文件和更新时间。
- `20_Wiki/Sources/`: 统计来源卡片。
- `30_Questions/open-questions.md`: 统计开放问题。
- `90_Manifests/sources.csv`: 读取来源登记和转化状态。
- `90_Manifests/dashboard-plan.json`: 保存看板任务和完成状态。
- `90_Manifests/github-daily-top.json`: 保存 GitHub 每日发现结果。

## Wiki 转化率定义

MVP 采用可解释估算：

```text
Wiki 转化率 = Source Card 数量 / Raw 文件总量
```

若 `sources.csv` 中状态包含 `ingested`、`converted`、`done`、`stable`、`growing`，则额外统计“已标记转化来源”。

后续可升级为更精确的 frontmatter 标记：

```yaml
raw_path: 10_Raw/example.md
status: ingested
updated_pages:
  - 20_Wiki/Concepts/example.md
ingested: 2026-05-24
```

## 视觉风格

参考复古报纸式数据界面：

- 米白背景。
- 细线分区。
- 左侧窄导航。
- 大号 serif 数字。
- 小号等宽标签。
- 黑色为主，绿色表示增长/完成，红色表示积压/风险。
- 少量卡片感，更多使用横线、列和版式。

## MVP 范围

本次实现：

- Obsidian 插件视图。
- 统计看板。
- Plan 看板。
- 新增、勾选、删除任务。
- 今日计划、本周目标、月度目标、年度目标。
- 历史任务弹窗，支持日任务/月任务切换和日期范围筛选。
- GitHub 每日 Top 5 模块，支持主题配置、DeepSeek 简介和每日自动刷新。
- 自动保存任务数据。
- 最近 30 天 Raw/Wiki 柱状图。
- 横轴/纵轴说明和图例。
- 轻量健康提示。

暂不实现：

- 多设备同步冲突处理。
- 图表库依赖。
- 复杂任务周期规则。
- 拖拽排序。
- 精确 Raw -> Wiki 双向溯源图谱。
