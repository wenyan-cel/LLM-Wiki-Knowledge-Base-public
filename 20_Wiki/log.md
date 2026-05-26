---
type: log
status: growing
updated: 2026-05-26
---

# Change Log

## 2026-05-26

- Added: 内容整理页接入本地 `wx-cli`，可按日期范围从微信文件传输助手导入分享链接。
- Added: 数据看板新增“内容整理”页，可导入微信文件传输助手中复制出的链接，按日期筛选、AI 分类并生成一句话简介。
- Updated: GitHub 热点逻辑改为 Star Radar，每天从可配置时间窗口内筛选高赞开源项目；热点源每天自动刷新一次，仍保留手动刷新。
- Added: DeepSeek 热点页新增 B站关键词视频热点和小红书外部 Endpoint 热点接入，并新增对应 manifest 文件。
- Updated: DeepSeek 热点页新增 SETTINGS 按钮，并支持配置 API Key、提示词和 GitHub 搜索规则。
- Updated: 数据看板左侧栏改为 tab 导航，DeepSeek/GitHub 热点收集改为独立页面，避免与右侧统计信息重复。

## 2026-05-25

- Added: 数据看板新增 GitHub Daily Top 5 模块，可按主题词每日搜集近 1 天 GitHub 热门开源项目。
- Added: 新增 DeepSeek API 配置项，用于为 GitHub 项目生成一句话中文简介。
- Added: 新增 `90_Manifests/github-daily-top.json` 保存每日发现结果。

## 2026-05-24

- Added: 新增 `LLM Wiki Dashboard` Obsidian 插件，用于 Raw/Wiki 统计、计划看板、任务完成率和 30 天趋势展示。
- Added: 新增 `00_System/dashboard-requirements.md` 作为数据看板需求文档。
- Updated: 数据看板新增月度目标、年度目标，并为 30 天趋势图补充横轴/纵轴说明和刻度标签。
- Added: 数据看板新增历史任务弹窗，可切换日任务/月任务，并按起止日期查看时间轴和完成率。
- Added: 新增 `90_Manifests/source-index.csv` 作为轻量语义索引，供 weave/search 低成本定位候选关系。
- Added: 新增 `90_Manifests/weave-relations.csv` 作为已确认关系登记表。
- Updated: `llm-wiki-ingest` 现在必须维护 `source-index.csv`。
- Updated: `llm-wiki-weave` 改为索引优先、候选集优先、分批精读，禁止全量读取 Raw/Wiki。
- Added: Ingest 3 篇文生图电商物料 Raw，新增 3 张 source card、6 个概念页、2 个实体页和 1 个综合页。
- Added: 使用 `source-index.csv` 为 3 篇来源建立轻量语义索引，并在 `weave-relations.csv` 登记 8 条跨来源关系。
- Open questions: 国内图像/视频 API 参数与平台合规规则需要持续用最新官方来源复核。

## 2026-05-23

- Updated: 精简 LLM Wiki skills，移除低频的 `llm-wiki-init` 和 `llm-wiki-maintainer`。
- Added: 新增 `llm-wiki-search`，用于基于 `20_Wiki/index.md` 和 wiki 双链进行搜索问答。
- Added: 新增 `llm-wiki-weave`，用于跨来源关系编织、应用案例关联和 Syntheses 综合页维护。
- Updated: 将随库 skills 保持在 `00_System/skills/`，方便打包迁移到其他电脑。

## 2026-05-22

- Added: 按 Karpathy 的 LLM wiki 思路建立初始 vault 结构。
- Added: 创建 `AGENTS.md`、系统规范、来源登记表、索引页和第一组概念页。
- Added: 登记 Karpathy gist 作为第一条来源。
- Updated: 将本库维护语言明确为中文。
- Added: 将 LLM Wiki skills 的完整副本放入 `00_System/skills/`，方便打包迁移到其他电脑。
- Updated: 将 `00_System` 中分散的流程、模板、清单说明合并回 `AGENTS.md` 和 `README.md`，让系统说明更集中。
- Open questions: 这个知识库后续主要服务哪些领域：AI 研究、编程、产品、写作、个人项目，还是混合用途？
