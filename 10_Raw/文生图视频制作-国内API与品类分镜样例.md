# 文生图视频制作 · 国内 API 对接与品类分镜样例

> 配套文档：`文生图视频制作-Dify-电商产品宣传物料.md`、`文生图视频制作-Coze-电商产品宣传物料.md`  
> 本文提供：**可落地的国内图像/视频 API 示例** + **美妆 / 3C / 服饰完整分镜 JSON**

---

## 1. 国内 API 选型速览

| 能力 | 常见服务 | 典型场景 | 接入形态 |
|------|---------|---------|---------|
| 文生图 | 阿里通义万相、火山 Seedream/即梦、智谱 CogView | 氛围场景、背景、生活方式图 | 异步任务 + 轮询 |
| 图生图 | 万相 general-image-to-image、自建 SD img2img | **贴真实产品图**（电商推荐） | 同步/异步 |
| 图生视频 | 可灵 Kling、MiniMax 海螺、火山 Seedance | 3–10s 动效片段 | 异步任务 + 轮询 |
| 轻量成片 | 自建 FFmpeg / 剪映开放平台 | 分镜图 + 字幕 + BGM | 同步 HTTP |

**生产建议**：对外 API 统一经 **自建网关** 封装，对 Dify/Coze 只暴露 `{ prompt, reference_url, width, height } → { image_url }`，便于换供应商。

---

## 2. 阿里通义万相 · 文生图（异步）

### 2.1 创建任务

```http
POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
Authorization: Bearer {DASHSCOPE_API_KEY}
Content-Type: application/json
X-DashScope-Async: enable
```

```json
{
  "model": "wanx-v1",
  "input": {
    "prompt": "A serum bottle on marble vanity, soft morning light, clean aesthetic, product photography, 3:4 vertical, empty space at bottom for text"
  },
  "parameters": {
    "style": "<auto>",
    "size": "768*1024",
    "n": 1,
    "seed": 42
  }
}
```

### 2.2 创建响应

```json
{
  "output": {
    "task_id": "8f8b8b8b-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "task_status": "PENDING"
  },
  "request_id": "req-xxxx"
}
```

### 2.3 轮询任务

```http
GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
Authorization: Bearer {DASHSCOPE_API_KEY}
```

```json
{
  "output": {
    "task_id": "8f8b8b8b-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "task_status": "SUCCEEDED",
    "results": [
      {
        "url": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/.../xxx.png"
      }
    ]
  }
}
```

> **注意**：OSS 结果 URL 有时效（常见 24h），工作流内需 **立即转存** 到自有 CDN/OSS。

### 2.4 图生图（参考产品图）

模型 `wanx-sketch-to-image-lite` 或 `wanx-style-repaint-v1` 等，需传 `ref_img` / `base_image_url`（以控制台当前文档为准）。网关统一为：

```json
{
  "model": "wanx-style-repaint-v1",
  "input": {
    "prompt": "same product in modern bathroom shelf, soft daylight",
    "base_image_url": "https://your-cdn.com/sku_hero.png"
  },
  "parameters": {
    "strength": 0.35,
    "size": "768*1024"
  }
}
```

`strength` 越低越接近原产品，电商场景建议 **0.25–0.45**。

---

## 3. 火山引擎 · 文生图（Seedream / 视觉智能）

> 具体 `req_key`、模型名以 [火山方舟 / 视觉智能控制台](https://www.volcengine.com/) 为准；以下为常见 **CVProcess** 形态。

### 3.1 文生图请求（网关封装示例）

```http
POST https://visual.volcengineapi.com/?Action=CVProcess&Version=2022-08-31
Authorization: {VOLC_SIGNATURE}
Content-Type: application/json
```

```json
{
  "req_key": "high_aes_general_v20",
  "prompt": "wireless earbuds charging case on dark gradient, rim light, tech product hero, 1:1, sharp edges",
  "width": 1024,
  "height": 1024,
  "seed": 42,
  "return_url": true
}
```

### 3.2 响应

```json
{
  "code": 10000,
  "data": {
    "image_urls": [
      "https://p3-volcengine-sign.byteimg.com/..."
    ]
  },
  "message": "Success"
}
```

### 3.3 Dify / Coze 侧统一响应（推荐网关输出）

```json
{
  "image_url": "https://cdn.yourcompany.com/assets/scene_01.png",
  "seed": 42,
  "provider": "volcengine",
  "raw_url": "https://p3-volcengine-sign.byteimg.com/..."
}
```

---

## 4. 可灵 Kling · 图生视频（异步）

### 4.1 创建图生视频任务

```http
POST https://api.klingai.com/v1/videos/image2video
Authorization: Bearer {KLING_API_KEY}
Content-Type: application/json
```

```json
{
  "model_name": "kling-v1",
  "image": "https://your-cdn.com/scene_01.png",
  "prompt": "slow camera push-in, product stays stable, soft studio light, minimal motion",
  "duration": "5",
  "mode": "std",
  "cfg_scale": 0.5
}
```

### 4.2 查询任务

```http
GET https://api.klingai.com/v1/videos/image2video/{task_id}
Authorization: Bearer {KLING_API_KEY}
```

```json
{
  "code": 0,
  "data": {
    "task_status": "succeed",
    "task_result": {
      "videos": [
        {
          "url": "https://.../output.mp4",
          "duration": "5.0"
        }
      ]
    }
  }
}
```

**电商参数建议**：

- `prompt` 强调 **product stays stable**，减少产品变形。  
- `duration` 用 5s 以内，长视频多段拼接。  
- 关键帧优先用 **实拍 hero 图** 或 img2img 结果。

---

## 5. MiniMax · 图生视频（海螺）

```http
POST https://api.minimax.chat/v1/video_generation
Authorization: Bearer {MINIMAX_API_KEY}
Content-Type: application/json
```

```json
{
  "model": "video-01",
  "prompt": "gentle parallax, fabric texture detail, fashion lookbook style",
  "first_frame_image": "https://your-cdn.com/scene_03.png"
}
```

轮询：

```http
GET https://api.minimax.chat/v1/query/video_generation?task_id={task_id}
```

---

## 6. 自建合成服务 · 分镜图转 MP4（同步）

当图生视频不稳定时，用 **FFmpeg 微服务** 做 Ken Burns + 字幕轨（Dify/Coze 均适用）。

```http
POST https://media-gateway.yourcompany.com/v1/compose
Content-Type: application/json
Authorization: Bearer {INTERNAL_TOKEN}
```

```json
{
  "sku_id": "SKU-2025-001",
  "fps": 30,
  "resolution": "1080x1920",
  "scenes": [
    {
      "image_url": "https://cdn.../scene_01.png",
      "duration_sec": 3,
      "motion": "zoom_in_slow",
      "subtitle": "每天一杯，营养不将就。"
    },
    {
      "image_url": "https://cdn.../scene_02.png",
      "duration_sec": 4,
      "motion": "pan_right",
      "subtitle": "3秒即溶，忙晨也从容。"
    }
  ],
  "audio": {
    "bgm_url": "https://cdn.../bgm_soft.mp3",
    "volume": 0.3
  }
}
```

```json
{
  "mp4_url": "https://cdn.../SKU-2025-001_v1.mp4",
  "duration_sec": 15,
  "job_id": "compose-abc123"
}
```

---

## 7. 网关编排伪代码（异步 API 通用）

```python
import time
import httpx

def text2image_wanx(prompt: str, size: str = "768*1024", seed: int = 42) -> str:
    r = httpx.post(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "X-DashScope-Async": "enable",
        },
        json={
            "model": "wanx-v1",
            "input": {"prompt": prompt},
            "parameters": {"size": size, "n": 1, "seed": seed},
        },
        timeout=30,
    )
    r.raise_for_status()
    task_id = r.json()["output"]["task_id"]

    for _ in range(60):
        t = httpx.get(
            f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=30,
        ).json()
        status = t["output"]["task_status"]
        if status == "SUCCEEDED":
            return rehost_to_cdn(t["output"]["results"][0]["url"])
        if status in ("FAILED", "CANCELED"):
            raise RuntimeError(t)
        time.sleep(2)
    raise TimeoutError(task_id)
```

`rehost_to_cdn`：下载临时 URL → 上传自有 OSS → 返回永久链（**Coze 飞书通知、Dify Webhook 必做**）。

---

## 8. 品类完整分镜样例

以下 JSON 可直接作为 Dify LLM 节点 / Coze 大模型节点的 **few-shot 输出目标**。  
变量说明：`{product_name}` `{brand}` 由工作流替换；**镜 1 建议绑定实拍 `reference_url`**。

---

### 8.1 美妆 · 精华液（30s 种草短视频 · 抖音 9:16）

**Brief 摘要**

| 字段 | 值 |
|------|-----|
| product_name | 烟酰胺焕亮精华液 |
| brand | 示例品牌 AuraLab |
| selling_points | 5% 烟酰胺、质地轻薄、早晚可用、敏感肌友好配方 |
| channel | douyin |
| duration | 30s |
| reference_url | 实拍白底瓶身图（镜 1、镜 4 必用） |

```json
{
  "meta": {
    "category": "beauty_skincare",
    "sku_id": "SKU-BEAUTY-001",
    "prompt_version": "v1.0-douyin-serum",
    "channel": "douyin",
    "aspect_ratio": "9:16",
    "total_duration_sec": 30,
    "visual_dna": "soft pastel, clean girl aesthetic, natural window light, minimal props, no visible logos, photorealistic product photography",
    "compliance_notes": "口播避免'美白''7天见效'等绝对化功效；用'焕亮''均匀肤色'等表述"
  },
  "hook": "熬夜脸又暗又糙？这支我空瓶三支了。",
  "scenes": [
    {
      "scene_id": 1,
      "duration_sec": 3,
      "shot_type": "hero_closeup",
      "narration_cn": "熬夜脸又暗又糙？先看这支精华。",
      "image_prompt_en": "Close-up hero shot of {product_name} serum bottle on soft pink marble vanity, morning window light, shallow depth of field, 9:16 vertical, space at top for subtitle, {visual_dna}",
      "negative_prompt": "deformed bottle, unreadable label text, brand logos, cartoon, oversaturated",
      "use_reference_image": true,
      "reference_strength": 0.3,
      "subtitle_safe_area": "top",
      "motion": "zoom_in_slow"
    },
    {
      "scene_id": 2,
      "duration_sec": 5,
      "shot_type": "texture_demo",
      "narration_cn": "质地像水一样轻，一抹就吸收。",
      "image_prompt_en": "Macro shot of clear serum drop on fingertip, translucent texture, soft backlight, skincare commercial, clean background, {visual_dna}",
      "negative_prompt": "dirty hands, extra fingers, text overlay, logo",
      "use_reference_image": false,
      "subtitle_safe_area": "bottom",
      "motion": "static"
    },
    {
      "scene_id": 3,
      "duration_sec": 6,
      "shot_type": "lifestyle",
      "narration_cn": "早晚两泵，护肤步骤不用改。",
      "image_prompt_en": "Young woman skincare routine in bright bathroom, applying serum, mirror reflection soft focus, lifestyle product ad, no clear face identity, {visual_dna}",
      "negative_prompt": "celebrity face, distorted features, medical claims text",
      "use_reference_image": false,
      "subtitle_safe_area": "bottom",
      "motion": "pan_left_slow"
    },
    {
      "scene_id": 4,
      "duration_sec": 5,
      "shot_type": "product_lineup",
      "narration_cn": "5% 烟酰胺，配方对敏感肌也友好。",
      "image_prompt_en": "{product_name} bottle with simple ingredient visualization bubbles nearby, minimalist science aesthetic, soft white background, {visual_dna}",
      "negative_prompt": "fake certificate, medical cross, misleading numbers on image",
      "use_reference_image": true,
      "reference_strength": 0.35,
      "subtitle_safe_area": "bottom",
      "motion": "zoom_out_slow"
    },
    {
      "scene_id": 5,
      "duration_sec": 6,
      "shot_type": "before_after_suggest",
      "narration_cn": "坚持打卡，肤色匀净更有光。",
      "image_prompt_en": "Split soft lighting concept, dull skin tone vs glowing skin tone, abstract no text, skincare result suggestion, ethical non-medical, {visual_dna}",
      "negative_prompt": "extreme whitening, before after text labels, guaranteed results",
      "use_reference_image": false,
      "subtitle_safe_area": "center",
      "motion": "crossfade"
    },
    {
      "scene_id": 6,
      "duration_sec": 5,
      "shot_type": "cta_endcard",
      "narration_cn": "链接在左下角，新人券记得领。",
      "image_prompt_en": "Product hero on pastel gradient background, generous empty space for CTA button overlay, e-commerce end card layout, {visual_dna}",
      "negative_prompt": "price numbers, platform logo, QR code",
      "use_reference_image": true,
      "reference_strength": 0.25,
      "subtitle_safe_area": "bottom",
      "motion": "static"
    }
  ],
  "audio": {
    "bgm_mood": "soft_lofi",
    "voice_style": "female_warm_cn"
  },
  "cta": "点击左下角了解详情"
}
```

**API 调用顺序**：镜 1/4/6 `wanx-style-repaint` + reference → 镜 2/3/5 纯文生图 → 镜 1–6 各调 Kling 5s（或 `/compose` 一次出 30s MP4）。

---

### 8.2 3C · 无线降噪耳机（45s 功能展示 · 淘系+信息流）

**Brief 摘要**

| 字段 | 值 |
|------|-----|
| product_name | AirBeat Pro 无线降噪耳机 |
| selling_points | 42dB 降噪、30h 续航、蓝牙 5.3、IPX5 |
| channel | taobao + ad_feed |
| duration | 45s |

```json
{
  "meta": {
    "category": "3c_audio",
    "sku_id": "SKU-3C-002",
    "prompt_version": "v1.1-3c-earbuds",
    "channel": "ad_feed",
    "aspect_ratio": "9:16",
    "total_duration_sec": 45,
    "visual_dna": "dark tech gradient, rim light, sharp product edges, minimal sci-fi props, commercial electronics photography, no fake UI text",
    "compliance_notes": "降噪数据需与详情页一致；禁止'行业第一'；对比图勿出现竞品 logo"
  },
  "hook": "地铁太吵？戴上它，世界瞬间静音。",
  "scenes": [
    {
      "scene_id": 1,
      "duration_sec": 4,
      "shot_type": "pain_point",
      "narration_cn": "地铁太吵，会议听不清？",
      "image_prompt_en": "Crowded subway silhouette with noise wave visual metaphor, moody blue tone, no readable ads, cinematic, {visual_dna}",
      "negative_prompt": "brand logos on subway ads, identifiable faces",
      "use_reference_image": false,
      "motion": "shake_subtle"
    },
    {
      "scene_id": 2,
      "duration_sec": 5,
      "shot_type": "hero_product",
      "narration_cn": "AirBeat Pro，开箱就是旗舰配置。",
      "image_prompt_en": "Hero shot of {product_name} earbuds and charging case floating on dark gradient, rim light, reflection on surface, 9:16, {visual_dna}",
      "negative_prompt": "distorted earbuds shape, wrong port details, random text",
      "use_reference_image": true,
      "reference_strength": 0.4,
      "motion": "orbit_slow"
    },
    {
      "scene_id": 3,
      "duration_sec": 8,
      "shot_type": "feature_anc",
      "narration_cn": "42 分贝主动降噪，通勤一路静悄悄。",
      "image_prompt_en": "Abstract ANC visualization around earbuds, sound waves cancelled, tech infographic style without numbers text, {visual_dna}",
      "negative_prompt": "fake lab certificate, misleading dB text on image",
      "use_reference_image": false,
      "motion": "zoom_in"
    },
    {
      "scene_id": 4,
      "duration_sec": 8,
      "shot_type": "feature_battery",
      "narration_cn": "耳机加充电盒，综合续航约 30 小时。",
      "image_prompt_en": "Charging case open with earbuds inside, battery icon abstract glow no digits, desk night scene, {visual_dna}",
      "negative_prompt": "incorrect LED layout, unreadable screen UI",
      "use_reference_image": true,
      "reference_strength": 0.35,
      "motion": "pan_up"
    },
    {
      "scene_id": 5,
      "duration_sec": 8,
      "shot_type": "feature_water",
      "narration_cn": "IPX5 防水，健身出汗也不慌。",
      "image_prompt_en": "Earbuds with water droplets on surface, gym bokeh background, sport lifestyle tech ad, {visual_dna}",
      "negative_prompt": "submerged underwater misleading, sauna scene",
      "use_reference_image": true,
      "reference_strength": 0.3,
      "motion": "slow_motion_drops"
    },
    {
      "scene_id": 6,
      "duration_sec": 7,
      "shot_type": "connectivity",
      "narration_cn": "蓝牙 5.3，开盖即连，延迟更低。",
      "image_prompt_en": "Earbuds near smartphone abstract connection beams, no readable phone UI, clean tech composition, {visual_dna}",
      "negative_prompt": "apple logo, competitor phone shape",
      "use_reference_image": false,
      "motion": "static"
    },
    {
      "scene_id": 7,
      "duration_sec": 5,
      "shot_type": "cta",
      "narration_cn": "限时直降，点击立抢。",
      "image_prompt_en": "Product bundle flat lay on dark background, large empty area for price sticker overlay, {visual_dna}",
      "negative_prompt": "specific price numbers, platform watermark",
      "use_reference_image": true,
      "reference_strength": 0.25,
      "motion": "zoom_in_slow"
    }
  ],
  "audio": {
    "bgm_mood": "electronic_upbeat",
    "voice_style": "male_confident_cn"
  },
  "cta": "立即抢购"
}
```

**API 建议**：hero/功能镜走 **img2img**；抽象功能镜（降噪波、连接光束）纯文生图；视频用 **compose 服务** 为主（产品细节镜少做图生视频），仅 hero 镜可试 Kling 5s。

---

### 8.3 服饰 · 春季风衣（30s 小红书种草 · 3:4 / 9:16）

**Brief 摘要**

| 字段 | 值 |
|------|-----|
| product_name | 轻量防风收腰风衣 |
| selling_points | 防泼水、可收纳、版型显瘦、春 autumn 两用 |
| channel | xiaohongshu |
| duration | 30s |
| reference_url | 平铺/挂拍实物图（镜 1、镜 5） |

```json
{
  "meta": {
    "category": "fashion_outerwear",
    "sku_id": "SKU-FASH-003",
    "prompt_version": "v1.0-xhs-trench",
    "channel": "xiaohongshu",
    "aspect_ratio": "3:4",
    "total_duration_sec": 30,
    "visual_dna": "natural street style, overcast soft daylight, film grain subtle, beige and olive palette, fashion editorial, no brand logos on clothes",
    "compliance_notes": "模特勿仿 celebrity；尺码效果因人而异，口播避免'显瘦10斤'等绝对化"
  },
  "hook": "春天风大又降温，这件风衣我天天想穿。",
  "scenes": [
    {
      "scene_id": 1,
      "duration_sec": 4,
      "shot_type": "flat_lay",
      "narration_cn": "春天风大又降温，备一件轻量风衣刚好。",
      "image_prompt_en": "Flat lay of {product_name} trench coat on linen background, coffee and magazine props, xiaohongshu aesthetic, 3:4, {visual_dna}",
      "negative_prompt": "wrinkled messy fabric, visible brand tag text, logo",
      "use_reference_image": true,
      "reference_strength": 0.45,
      "motion": "static"
    },
    {
      "scene_id": 2,
      "duration_sec": 5,
      "shot_type": "fabric_detail",
      "narration_cn": "面料轻但不塌，走一天也不闷。",
      "image_prompt_en": "Macro fabric texture of trench coat material, water repellent droplets beading, soft focus, {visual_dna}",
      "negative_prompt": "plastic looking fabric, fake label",
      "use_reference_image": false,
      "motion": "pan_right"
    },
    {
      "scene_id": 3,
      "duration_sec": 6,
      "shot_type": "street_walk",
      "narration_cn": "收腰剪裁，搭配牛仔裤就很好看。",
      "image_prompt_en": "Fashion model walking on city street wearing beige trench coat, back view or side view no clear face, spring outfit, {visual_dna}",
      "negative_prompt": "identifiable celebrity, distorted legs, wrong coat color",
      "use_reference_image": false,
      "motion": "follow_walk"
    },
    {
      "scene_id": 4,
      "duration_sec": 5,
      "shot_type": "packable",
      "narration_cn": "折叠收纳体积小，出差也能塞进行李箱。",
      "image_prompt_en": "Trench coat folded into small pouch on suitcase, travel scene, minimal composition, {visual_dna}",
      "negative_prompt": "impossible tiny size exaggeration, text claims",
      "use_reference_image": false,
      "motion": "zoom_out"
    },
    {
      "scene_id": 5,
      "duration_sec": 5,
      "shot_type": "outfit_mirror",
      "narration_cn": "卡其和橄榄两色，日常通勤都百搭。",
      "image_prompt_en": "Mirror outfit shot two trench coat colors on rack, cozy bedroom corner, no face in mirror, {visual_dna}",
      "negative_prompt": "clear face reflection, brand store logo",
      "use_reference_image": true,
      "reference_strength": 0.35,
      "motion": "static"
    },
    {
      "scene_id": 6,
      "duration_sec": 5,
      "shot_type": "cta_soft",
      "narration_cn": "链接在主页橱窗，Spring 上新价已开。",
      "image_prompt_en": "Coat on minimal hanger against warm wall, empty space for text overlay, gentle lifestyle end card, {visual_dna}",
      "negative_prompt": "price tag readable, QR code",
      "use_reference_image": true,
      "reference_strength": 0.3,
      "motion": "fade_in"
    }
  ],
  "audio": {
    "bgm_mood": "acoustic_light",
    "voice_style": "female_casual_cn"
  },
  "cta": "主页橱窗查看"
}
```

**API 建议**：服饰 **强依赖 reference** 保持版型颜色；街景/模特镜纯 AI，终审注意版型一致性；视频优先 **compose + 轻 motion**，慎用大幅度图生视频以免衣服变形。

---

## 9. 分镜 → API 批处理映射表

| scene 字段 | 文生图 API | 图生视频 API | 备注 |
|------------|-----------|-------------|------|
| `use_reference_image: true` | 万相 repaint / img2img | Kling image2video | 设 `reference_strength` |
| `use_reference_image: false` | 万相/火山 text2image | 可选，或仅 compose | 氛围/抽象镜 |
| `motion` | — | compose 参数 / Kling prompt | 写进合成 JSON |
| `narration_cn` | — | compose subtitle | 勿指望模型渲染文字 |

---

## 10. 剪映批量导入 CSV 列（可选）

```csv
scene_id,duration_sec,image_url,subtitle,motion,audio_in,audio_out
1,3,https://cdn.../s1.png,熬夜脸又暗又糙？,zoom_in_slow,0,0.3
2,5,https://cdn.../s2.png,质地像水一样轻,static,0.3,0.3
```

工作流最后一节点输出 CSV 下载链接，设计可在 CapCut/剪映专业版批量套模板。
