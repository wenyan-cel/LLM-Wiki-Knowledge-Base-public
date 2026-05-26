# LLM Wiki Knowledge Base

一个面向 AI 辅助维护的 Obsidian 知识库模板。

它把 Andrej Karpathy 提到的 “LLM Wiki / 编译式知识库” 思路落到一个可直接使用的 vault 里：原始资料先进 `Raw`，长期知识沉淀到 `Wiki`，再用 Codex skills 和看板插件帮助你持续吸收、连接、检索和整理。

这个项目适合这些场景：

- 你经常看文章、视频、论文、课程、播客，但资料散在各处。
- 你希望 AI 帮你把原始资料整理成可复用的知识页面。
- 你希望知识不是一篇篇孤立摘要，而是能形成概念、实体、来源、综合页之间的关系图谱。
- 你想把微信文件传输助手、B站、GitHub、小红书等来源里的链接统一收进一个整理台。

## 功能概览

- Karpathy 风格 Raw/Wiki 知识库结构。
- Obsidian 双链知识图谱。
- 四个随库 Codex skills：吸收、编织、搜索、健康维护。
- 数据看板插件 `LLM Wiki Dashboard`。
- Dashboard 页面：Raw/Wiki 统计、计划看板、任务完成率、趋势图。
- DeepSeek Hot 页面：GitHub Star Radar、B站热点、小红书外部接口热点。
- 内容整理页面：导入微信文件传输助手链接，按日期筛选，AI 分类，并生成一句话简介。
- 支持本地 `wx-cli`，从个人微信本地数据中读取文件传输助手消息。
- 所有数据默认保存在本地 Obsidian vault 中。

## 1. Karpathy 知识框架：Raw 到 Wiki

本项目的核心不是“存很多笔记”，而是把资料逐步编译成稳定知识。

Karpathy 的思路可以简单理解为：

```text
外部资料
  ↓
10_Raw：原始输入层
  ↓
AI / 人工编译
  ↓
20_Wiki：长期知识层
  ↓
双链、索引、综合页
  ↓
可检索、可问答、可输出的个人知识库
```

### 为什么采用 Raw/Wiki 分层

很多知识库最后会乱，是因为“原始材料”和“长期知识”混在一起：

- 一篇文章摘录是一种材料，不一定值得长期维护。
- 一个稳定概念是一种知识，应该长期更新和链接。
- 一个视频可能只提供一个案例，但这个案例应该挂到已有概念页下面。

Raw/Wiki 分层可以避免这个问题。

### `10_Raw/` 是什么

`10_Raw/` 用来放原始资料，例如：

- 网页摘录
- B站/YouTube 视频笔记
- PDF 转写
- 微信、飞书、聊天记录
- 临时想法
- 课程笔记

Raw 的原则是：**尽量保留原貌，不急着精修。**

Raw 更像收件箱。它回答的是：“我从哪里看到了什么？”

### `20_Wiki/` 是什么

`20_Wiki/` 是长期维护的知识层。这里不追求“一篇资料一篇笔记”，而是追求“一页一个稳定主题”。

典型目录包括：

```text
20_Wiki/
  Concepts/    概念页
  Entities/    人物、工具、公司、项目等实体页
  Sources/     来源卡片，用来追踪每个 Raw 的出处
  Syntheses/   综合页，用来跨来源总结一个主题
  index.md     Wiki 总入口
  log.md       知识库变更记录
```

Wiki 的原则是：**新资料进来后，优先更新已有页面，而不是永远新建孤立摘要。**

这样做的好处：

- 知识会越来越连贯，而不是越来越碎。
- 同一主题的多篇资料会被编织到一起。
- 后续问答、写作、研究时，可以直接基于 Wiki，而不是从 Raw 重新翻。
- Obsidian 图谱会越来越接近你的真实理解结构。

### 附图 1：Raw/Wiki 知识图谱

把你的图谱截图放到下面路径后，GitHub 会自动显示：

```text
docs/images/figure-1-knowledge-graph.png
```

![附图 1：Raw/Wiki 知识图谱](docs/images/figure-1-knowledge-graph.png)

## 2. 四个 Codex Skills

本项目自带四个 skills，位于：

```text
00_System/skills/
```

它们是给 Codex 这类 AI 编程/知识库代理看的操作说明。你可以把它们复制到自己的 Codex skills 目录中，也可以随库打包迁移。

### 2.1 `llm-wiki-ingest`

用途：把新资料从 `10_Raw/` 编译进 `20_Wiki/`。

适合这样说：

```text
使用 llm-wiki-ingest，把 10_Raw 里的这篇资料编译进 wiki。
```

它会做的事：

- 阅读 Raw。
- 创建或更新 Source Card。
- 找到相关概念页、实体页、综合页。
- 补充双链。
- 更新 `90_Manifests/source-index.csv`。
- 更新 `20_Wiki/log.md`。

### 2.2 `llm-wiki-weave`

用途：发现不同资料之间的关系，让知识库不只是摘要集合，而是知识网络。

适合这样说：

```text
使用 llm-wiki-weave，编织这些 AI 文生图资料之间的关系。
```

它会关注：

- 不同来源是否讨论同一问题。
- 哪些资料是案例、方法、反例、补充。
- 哪些概念应该互相链接。
- 哪些综合页需要更新。
- 哪些关系应该写入 `90_Manifests/weave-relations.csv`。

### 2.3 `llm-wiki-search`

用途：基于 Wiki 做搜索问答。

适合这样说：

```text
使用 llm-wiki-search，基于这个知识库回答：AI 文生图电商物料工作流有哪些？
```

它会优先查：

- `20_Wiki/index.md`
- `90_Manifests/source-index.csv`
- 相关 Concepts / Entities / Syntheses
- Source Cards

原则是：**优先基于 Wiki 回答，而不是直接在 Raw 里乱搜。**

### 2.4 `llm-wiki-health`

用途：定期维护知识库健康度。

适合这样说：

```text
使用 llm-wiki-health，给这个知识库做一次健康检查。
```

它会检查：

- 是否有孤立页面。
- 是否有断链。
- 是否有重复概念。
- Source Card 是否缺失。
- Open Questions 是否长期未处理。
- 索引和关系表是否需要更新。

### 安装 skills 到 Codex

Windows PowerShell 示例：

```powershell
$vault = "D:\path\to\LLM-Wiki-Knowledge-Base"
$codexSkills = "$env:USERPROFILE\.codex\skills"
New-Item -ItemType Directory -Force -Path $codexSkills
Copy-Item -Recurse -Force "$vault\00_System\skills\llm-wiki-*" $codexSkills
```

复制后重启 Codex，新会话里就能看到这些 skills。

## 3. LLM Wiki Dashboard 看板插件

本库自带一个 Obsidian 插件：

```text
.obsidian/plugins/llm-wiki-dashboard/
```

打开方式：

1. 用 Obsidian 打开本 vault。
2. 进入 `设置 -> 第三方插件`，确认已开启第三方插件。
3. 启用 `LLM Wiki Dashboard`。
4. 点击左侧栏图标，或在命令面板运行：

```text
Open LLM Wiki Dashboard
```

看板有三个页面：`Dashboard`、`DeepSeek hot`、`内容整理`。

### 3.1 Dashboard 页面

Dashboard 是知识库运行状态页。

它展示：

- 今日新增 Raw。
- 本月新增 Raw。
- Raw 总量。
- Wiki 转化率。
- 今日任务完成率。
- 月度任务完成率。
- Open Questions 数量。
- Health Score。
- 今日计划、周目标、月目标、年目标。
- 最近 30 天 Raw/Wiki 趋势图。
- 历史任务看板。

### 附图 2：Dashboard 页面

把 Dashboard 截图放到下面路径：

```text
docs/images/figure-2-dashboard.png
```

![附图 2：Dashboard 页面](docs/images/figure-2-dashboard.png)

### 3.2 DeepSeek hot 页面

DeepSeek hot 是热点发现页。

它目前支持三个来源：

1. GitHub Star Radar
2. B站关键词视频热点
3. 小红书外部/自建 API Endpoint

GitHub Star Radar 的逻辑不是“当天高赞项目”，而是：

- 每天固定刷新一次。
- 在可配置时间窗口内筛选高赞项目。
- 时间窗口可选近一月、近三月、近半年、近一年。
- 按 stars 降序。
- 用 DeepSeek 生成一句话简介。

B站逻辑是：

- 按关键词搜索视频。
- 展示 Top N。
- 可用 DeepSeek 生成一句话简介。

小红书逻辑是：

- 由于小红书没有稳定公开搜索 API，本项目采用外部/自建 API Endpoint 的方式。
- Endpoint 支持 `{keyword}` 和 `{limit}` 占位符。
- 返回数组或 `{ items: [...] }` 即可接入。

### 附图 3：DeepSeek hot 页面

把热点页截图放到下面路径：

```text
docs/images/figure-3-deepseek-hot.png
```

![附图 3：DeepSeek hot 页面](docs/images/figure-3-deepseek-hot.png)

### 3.3 内容整理页面

内容整理页解决一个很常见的问题：

你平时在手机或电脑上刷 B站、YouTube、小红书、GitHub、文章，会把感兴趣的链接先分享到微信文件传输助手。真正整理时，往往已经隔了很多天，需要重新翻聊天记录。

这个页面把流程改成：

```text
微信文件传输助手 / 手动粘贴链接
  ↓
按日期范围导入
  ↓
AI 自动分类，或按用户设置标签分类
  ↓
生成每个链接的一句话简介
  ↓
后续再进入 Raw / Wiki
```

它支持：

- 手动粘贴链接。
- 通过 `wx-cli` 从微信文件传输助手按日期范围导入。
- 按起止日期筛选。
- 自定义分类标签。
- DeepSeek 自动分类。
- 每个链接生成一句话简介。
- B站和 YouTube 链接尽量自动获取标题。

内容整理数据保存在：

```text
90_Manifests/content-inbox.json
```

### 附图 4：内容整理页面

把内容整理页截图放到下面路径：

```text
docs/images/figure-4-content-organizer.png
```

![附图 4：内容整理页面](docs/images/figure-4-content-organizer.png)

## 4. Dashboard 配置说明

进入：

```text
设置 -> LLM Wiki Dashboard
```

常用配置包括：

- GitHub 搜集主题。
- GitHub 时间窗口。
- GitHub 搜索规则。
- B站搜索主题。
- 小红书 API Endpoint。
- DeepSeek API Key。
- DeepSeek Model。
- DeepSeek 提示词。
- 内容整理分类标签。
- wx-cli 路径。
- 微信会话名。

### DeepSeek API Key

如果你希望插件自动生成简介和分类，需要配置 DeepSeek API Key。

注意：

- API Key 只保存在本地 Obsidian 插件数据中。
- 不要把 `.obsidian/plugins/llm-wiki-dashboard/data.json` 提交到 GitHub。
- 本项目的 `.gitignore` 已默认忽略该文件。

## 5. 附录：wx-cli 安装与使用

`wx-cli` 是一个微信本地数据命令行工具，可以读取你本机微信缓存中的聊天记录。它适合本项目的“内容整理”场景：从文件传输助手按日期范围提取分享链接。

项目地址：

```text
https://github.com/jackwener/wx-cli
```

### 5.1 安装 wx-cli

确保电脑已安装 Node.js 和 npm。

Windows PowerShell：

```powershell
npm install -g @jackwener/wx-cli
```

安装后检查：

```powershell
wx --help
```

如果能看到 `sessions`、`history`、`search` 等命令，说明安装成功。

### 5.2 初始化 wx-cli

保持微信客户端已登录，然后运行：

```powershell
wx init
```

初始化会检测本机微信数据目录，并生成本地配置。

成功后，你可以测试：

```powershell
wx sessions --json -n 10
```

查看文件传输助手历史记录：

```powershell
wx history "文件传输助手" --since 2026-05-15 --until 2026-05-25 --json
```

如果能返回聊天记录，说明 `wx-cli` 已经可以被本项目使用。

### 5.3 在 LLM Wiki Dashboard 中使用 wx-cli

1. 打开 Obsidian。
2. 进入 `设置 -> LLM Wiki Dashboard`。
3. 设置 `wx-cli 路径`：
   - 如果 `wx` 已加入 PATH，填 `wx`。
   - Windows 上也可以填完整路径，例如：

```text
C:\Users\<你的用户名>\AppData\Roaming\npm\wx.cmd
```

4. 设置 `微信会话名`：

```text
文件传输助手
```

5. 打开 Dashboard 的 `内容整理` 页面。
6. 选择起止日期。
7. 点击 `IMPORT WECHAT`。
8. 导入后点击 `CLASSIFY`，让 DeepSeek 分类并生成简介。

### 5.4 隐私与安全提醒

`wx-cli` 读取的是你本机自己的微信数据。请注意：

- 不要把 `C:\Users\<你的用户名>\.wx-cli\` 上传到 GitHub。
- 不要把 `90_Manifests/content-inbox.json` 里的个人链接公开。
- 不要提交 `.obsidian/plugins/llm-wiki-dashboard/data.json`，里面可能有 API Key。
- 本项目 `.gitignore` 已默认忽略这些敏感文件。

## 6. 目录说明

```text
LLM-Wiki-Knowledge-Base/
  AGENTS.md
  README.md
  00_System/
    skills/
  10_Raw/
  20_Wiki/
    Concepts/
    Entities/
    Sources/
    Syntheses/
    index.md
    log.md
  30_Questions/
  40_Outputs/
  90_Manifests/
  .obsidian/plugins/llm-wiki-dashboard/
```

重要文件：

- `AGENTS.md`：AI 维护本库前应先阅读的操作约定。
- `10_Raw/`：原始资料层。
- `20_Wiki/`：长期知识层。
- `30_Questions/open-questions.md`：未解决问题。
- `90_Manifests/source-index.csv`：轻量语义索引。
- `90_Manifests/weave-relations.csv`：跨来源关系登记。
- `90_Manifests/content-inbox.json`：内容整理收件箱。


确认没有 API Key、微信数据、个人链接、个人任务计划被提交。

