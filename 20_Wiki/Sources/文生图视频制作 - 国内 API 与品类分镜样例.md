---
type: source
status: ingested
updated: 2026-05-24
author: 用户资料
raw_path: 10_Raw/文生图视频制作-国内API与品类分镜样例.md
---

# 文生图视频制作 - 国内 API 与品类分镜样例

## 元数据

- 来源类型：Raw 笔记
- 场景：国内图像/视频 API 与电商品类分镜
- Raw：[[10_Raw/文生图视频制作-国内API与品类分镜样例|文生图视频制作-国内API与品类分镜样例]]

## 可吸收观点

- 国内图像/视频 API 常见组合包括万相、火山、可灵、MiniMax，以及自建 FFmpeg/compose 服务。
- 生产中建议通过 media-gateway 统一封装请求、鉴权、轮询和临时 URL 转存。
- 美妆、3C、服饰三类电商素材的分镜结构差异明显：美妆重氛围和成分表达，3C 重功能抽象可视化，服饰重版型和生活方式。
- 图生视频适合短动效和氛围镜头，产品细节稳定性较弱，电商主流程更适合分镜图 + 剪辑合成。
- `use_reference_image`、`reference_strength`、`motion`、`narration_cn` 等字段可作为分镜 JSON 与 API 的映射桥梁。

## 已更新的 Wiki 页面

- [[../Concepts/AI 文生图视频电商物料]]
- [[../Concepts/国内图像视频 API]]
- [[../Concepts/图生视频与剪辑合成]]
- [[../Concepts/提示词工程（电商物料）]]
- [[../Syntheses/AI 文生图电商物料实践路线图]]

## 关联来源

- [[文生图视频制作 - Dify 电商产品宣传物料]]：方法补充，给 Dify 工作流提供 API 与 few-shot 细节。
- [[文生图视频制作 - Coze 电商产品宣传物料]]：方法补充，给 Coze 工作流提供 API 与品类样例。

## 关联概念

- [[../Concepts/国内图像视频 API]]
- [[../Concepts/图生视频与剪辑合成]]
- [[../Concepts/AI 生成电商物料合规]]

## 应用案例

- 美妆精华液：适合柔和氛围图、质地 macro、成分可视化。
- 3C 耳机：适合 hero 产品图、降噪抽象可视化、续航与防水功能镜头。
- 服饰风衣：适合 reference 锁定版型颜色，街景镜头需要人工核对。

## 待验证

- 国内 API 参数、模型名和鉴权方式变化快，需要以各平台最新文档为准。
