---
type: concept
status: seed
updated: 2026-05-22
---

# Wiki before RAG

## 一句话定义

Wiki before RAG 指先把知识整理成高质量 wiki，再把检索、问答或自动化建立在 wiki 之上。

## 为什么重要

直接对混乱资料做 RAG，检索出来的仍然可能是重复、过时、矛盾或噪声文本。先维护 wiki，可以把检索对象变成经过整理的知识层。

## 核心要点

- RAG 偏向“找片段”，wiki 偏向“维护理解”。
- wiki 页能承载跨来源整合，原始 chunk 很难做到。
- 高质量 wiki 可以成为未来 RAG、写作、学习、决策的共同基础。

## 实践方法

- 把 `20_Wiki/` 当成主要检索对象。
- 把 `10_Raw/` 当成溯源和复核对象。
- 输出前优先引用 wiki，再回查来源。

## 相关页面

- [[LLM Wiki]]
- [[知识编译]]

## 来源

- [[../Sources/Karpathy - LLM Wiki|Karpathy - LLM Wiki]]

