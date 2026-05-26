---
type: concept
status: seed
updated: 2026-05-22
---

# LLM Wiki

## 一句话定义

LLM Wiki 是一个由人和 AI 共同维护的 Markdown 知识库：原始资料不断进入，LLM 负责把它们压缩、合并、重组为长期可读的 wiki 页面。

## 为什么重要

传统笔记容易变成一堆孤立摘要。LLM Wiki 的重点是把新资料“编译”进已有知识网络，让页面随着输入增多而变得更可靠、更紧凑、更互联。

## 核心要点

- 原始材料和编译后知识要分层存放。
- 新资料进入后，优先更新已有页面。
- wiki 页应围绕稳定主题，而不是围绕某篇文章。
- 来源卡片负责追溯，概念页负责理解。
- 维护规则写进 `AGENTS.md`，让 AI 后续能持续按同一套习惯工作。

## 实践方法

1. 把资料放入 `10_Raw/`。
2. 在 `20_Wiki/Sources/` 建来源卡。
3. 把其中的知识合并到 `20_Wiki/Concepts/`、`Entities/` 或 `Syntheses/`。
4. 在 `log.md` 记录更新。
5. 把疑问写入 `30_Questions/open-questions.md`。

## 相关页面

- [[知识编译]]
- [[Wiki before RAG]]
- [[../Sources/Karpathy - LLM Wiki|Karpathy - LLM Wiki]]

## 来源

- [[../Sources/Karpathy - LLM Wiki|Karpathy - LLM Wiki]]

## 待验证

- 在个人知识库场景中，哪些页面粒度最适合长期维护？

