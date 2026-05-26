const { ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } = require("obsidian");
const childProcess = (() => {
  try {
    return require("child_process");
  } catch (error) {
    return null;
  }
})();
const DEFAULT_WX_CLI_PATH = process.platform === "win32" && process.env.APPDATA
  ? `${process.env.APPDATA}\\npm\\wx.cmd`
  : "wx";
const DEFAULT_COMMAND_CWD = process.env.USERPROFILE || process.env.HOME || undefined;

const VIEW_TYPE = "llm-wiki-dashboard-view";
const PLAN_PATH = "90_Manifests/dashboard-plan.json";
const GITHUB_TOP_PATH = "90_Manifests/github-daily-top.json";
const BILIBILI_TOP_PATH = "90_Manifests/bilibili-daily-top.json";
const XHS_TOP_PATH = "90_Manifests/xiaohongshu-daily-top.json";
const CONTENT_INBOX_PATH = "90_Manifests/content-inbox.json";
const SOURCES_CSV = "90_Manifests/sources.csv";
const OPEN_QUESTIONS = "30_Questions/open-questions.md";
const DEFAULT_SETTINGS = {
  githubTopic: "ai",
  githubTopN: 5,
  githubAutoRefresh: true,
  githubTimeWindowDays: 30,
  githubSearchRule: "{topic} created:>={since}",
  bilibiliTopic: "AI",
  bilibiliTopN: 5,
  bilibiliOrder: "pubdate",
  xhsTopic: "AI",
  xhsTopN: 5,
  xhsEndpoint: "",
  xhsApiKey: "",
  contentCategories: "AI-文生图,AI-生成视频,AI-Agent,编程工具,知识管理,产品设计,商业案例,待判断",
  wxCliPath: DEFAULT_WX_CLI_PATH,
  wxSessionName: "文件传输助手",
  wxHistoryLimit: 2000,
  deepseekApiKey: "",
  deepseekEndpoint: "https://api.deepseek.com/chat/completions",
  deepseekModel: "deepseek-v4-pro",
  deepseekPrompt: "你是开源项目信报助手。请为每个 GitHub 项目生成一句中文简介，说明它解决什么问题。只输出 JSON 数组，每项包含 full_name 和 one_liner。"
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function yearKey(date) {
  return `${date.getFullYear()}`;
}

function weekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(week)}`;
}

function isSameDay(ts, key) {
  return dateKey(new Date(ts)) === key;
}

function isSameMonth(ts, key) {
  return monthKey(new Date(ts)) === key;
}

function pct(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function isIgnoredRaw(path) {
  const name = path.split("/").pop();
  return name === "README.md" || name === ".gitkeep" || name.startsWith(".");
}

function classifyTaskType(value) {
  return value || "wiki";
}

function rangeDefaultStart(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateKey(date);
}

function inDateRange(value, start, end) {
  if (!value) return false;
  return value >= start && value <= end;
}

function monthInDateRange(value, start, end) {
  if (!value) return false;
  const startMonth = start.slice(0, 7);
  const endMonth = end.slice(0, 7);
  return value >= startMonth && value <= endMonth;
}

function groupBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text || "");
  } catch (error) {
    return fallback;
  }
}

class TaskHistoryModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.mode = "daily";
    this.start = rangeDefaultStart(30);
    this.end = dateKey(new Date());
  }

  async onOpen() {
    await this.render();
  }

  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("lwd-history-modal");

    const plan = await this.plugin.loadPlan();
    const shell = contentEl.createDiv({ cls: "lwd-history-shell" });
    const head = shell.createDiv({ cls: "lwd-history-head" });
    const title = head.createDiv();
    title.createDiv({ cls: "lwd-section-title", text: "TASK HISTORY" });
    title.createDiv({ cls: "lwd-history-subtitle", text: "按时间轴回看计划与完成情况" });

    const controls = head.createDiv({ cls: "lwd-history-controls" });
    const dailyBtn = controls.createEl("button", { text: "DAY" });
    const monthlyBtn = controls.createEl("button", { text: "MONTH" });
    dailyBtn.toggleClass("is-active", this.mode === "daily");
    monthlyBtn.toggleClass("is-active", this.mode === "monthly");
    dailyBtn.addEventListener("click", async () => {
      this.mode = "daily";
      await this.render();
    });
    monthlyBtn.addEventListener("click", async () => {
      this.mode = "monthly";
      await this.render();
    });

    const filters = shell.createDiv({ cls: "lwd-history-filters" });
    filters.createSpan({ text: "START" });
    const startInput = filters.createEl("input", { attr: { type: "date", value: this.start } });
    filters.createSpan({ text: "END" });
    const endInput = filters.createEl("input", { attr: { type: "date", value: this.end } });
    const apply = filters.createEl("button", { text: "APPLY" });
    apply.addEventListener("click", async () => {
      this.start = startInput.value || this.start;
      this.end = endInput.value || this.end;
      if (this.start > this.end) {
        const temp = this.start;
        this.start = this.end;
        this.end = temp;
      }
      await this.render();
    });

    const body = shell.createDiv({ cls: "lwd-history-body" });
    if (this.mode === "daily") {
      this.renderDailyHistory(body, plan);
    } else {
      this.renderMonthlyHistory(body, plan);
    }
  }

  renderDailyHistory(body, plan) {
    const tasks = plan.daily
      .filter((task) => inDateRange(task.date || task.created, this.start, this.end))
      .sort((a, b) => (b.date || b.created || "").localeCompare(a.date || a.created || ""));
    this.renderHistorySummary(body, tasks, "日任务");
    const groups = groupBy(tasks, (task) => task.date || task.created || "未记录日期");
    this.renderTimeline(body, groups);
  }

  renderMonthlyHistory(body, plan) {
    const monthlyGoals = plan.monthly
      .filter((task) => monthInDateRange(task.month || (task.created || "").slice(0, 7), this.start, this.end));
    const dailyTasks = plan.daily
      .filter((task) => inDateRange(task.date || task.created, this.start, this.end))
      .map((task) => ({ ...task, month: (task.date || task.created || "").slice(0, 7), fromDaily: true }));
    const tasks = [...monthlyGoals, ...dailyTasks]
      .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
    this.renderHistorySummary(body, tasks, "月任务");
    const groups = groupBy(tasks, (task) => task.month || "未记录月份");
    this.renderTimeline(body, groups);
  }

  renderHistorySummary(body, tasks, label) {
    const done = tasks.filter((task) => task.done).length;
    const summary = body.createDiv({ cls: "lwd-history-summary" });
    summary.createDiv({ cls: "lwd-history-number", text: `${pct(done, tasks.length)}%` });
    summary.createDiv({ cls: "lwd-history-copy", text: `${label}完成率 · ${done}/${tasks.length} · ${this.start} 至 ${this.end}` });
  }

  renderTimeline(body, groups) {
    const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const timeline = body.createDiv({ cls: "lwd-history-timeline" });
    if (!keys.length) {
      timeline.createDiv({ cls: "lwd-empty", text: "这个时间段暂无历史任务" });
      return;
    }
    for (const key of keys) {
      const tasks = groups[key];
      const done = tasks.filter((task) => task.done).length;
      const block = timeline.createDiv({ cls: "lwd-history-block" });
      const h = block.createDiv({ cls: "lwd-history-date" });
      h.createSpan({ text: key });
      h.createSpan({ text: `${done}/${tasks.length} DONE` });
      for (const task of tasks) {
        const row = block.createDiv({ cls: `lwd-history-task ${task.done ? "is-done" : ""}` });
        row.createSpan({ cls: "lwd-history-mark", text: task.done ? "✓" : "·" });
        row.createSpan({ cls: "lwd-task-text", text: task.text });
        row.createSpan({ cls: "lwd-task-type", text: task.fromDaily ? "daily" : (task.type || "wiki") });
      }
    }
  }
}

class LlmWikiDashboardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "LLM Wiki Dashboard" });

    new Setting(containerEl)
      .setName("GitHub 搜集主题")
      .setDesc("例如 ai、llm、agent、computer-vision。用于搜索近 1 天新建的热门开源项目。")
      .addText((text) => text
        .setPlaceholder("ai")
        .setValue(this.plugin.settings.githubTopic)
        .onChange(async (value) => {
          this.plugin.settings.githubTopic = value.trim() || "ai";
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("GitHub Top N")
      .setDesc("每日展示的项目数量。")
      .addText((text) => text
        .setPlaceholder("5")
        .setValue(String(this.plugin.settings.githubTopN))
        .onChange(async (value) => {
          const n = Number.parseInt(value, 10);
          this.plugin.settings.githubTopN = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 5;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("GitHub 时间窗口")
      .setDesc("每天从该时间范围内筛选高赞开源项目，而不是只看当天新建项目。")
      .addDropdown((dropdown) => dropdown
        .addOption("30", "近一月")
        .addOption("90", "近三月")
        .addOption("180", "近半年")
        .addOption("365", "近一年")
        .setValue(String(this.plugin.settings.githubTimeWindowDays || DEFAULT_SETTINGS.githubTimeWindowDays))
        .onChange(async (value) => {
          this.plugin.settings.githubTimeWindowDays = Number.parseInt(value, 10) || DEFAULT_SETTINGS.githubTimeWindowDays;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("GitHub 搜索规则")
      .setDesc("高级选项。支持 {topic} 和 {since} 占位符，{since} 由时间窗口计算。例如：{topic} created:>={since} stars:>20。")
      .addText((text) => text
        .setPlaceholder("{topic} created:>={since}")
        .setValue(this.plugin.settings.githubSearchRule)
        .onChange(async (value) => {
          this.plugin.settings.githubSearchRule = value.trim() || DEFAULT_SETTINGS.githubSearchRule;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("B站搜索主题")
      .setDesc("用于搜索 Bilibili 视频热点，例如 AI、文生图、Obsidian。")
      .addText((text) => text
        .setPlaceholder("AI")
        .setValue(this.plugin.settings.bilibiliTopic)
        .onChange(async (value) => {
          this.plugin.settings.bilibiliTopic = value.trim() || DEFAULT_SETTINGS.bilibiliTopic;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("B站 Top N")
      .setDesc("每次展示的视频数量。")
      .addText((text) => text
        .setPlaceholder("5")
        .setValue(String(this.plugin.settings.bilibiliTopN))
        .onChange(async (value) => {
          const n = Number.parseInt(value, 10);
          this.plugin.settings.bilibiliTopN = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 5;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("小红书搜索主题")
      .setDesc("用于外部小红书采集接口的关键词。")
      .addText((text) => text
        .setPlaceholder("AI")
        .setValue(this.plugin.settings.xhsTopic)
        .onChange(async (value) => {
          this.plugin.settings.xhsTopic = value.trim() || DEFAULT_SETTINGS.xhsTopic;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("小红书 API Endpoint")
      .setDesc("第三方或自建接口。支持 {keyword} 和 {limit} 占位符，返回数组或 {items:[...]}。留空则不自动采集。")
      .addText((text) => text
        .setPlaceholder("https://example.com/xhs/search?keyword={keyword}&limit={limit}")
        .setValue(this.plugin.settings.xhsEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.xhsEndpoint = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("小红书 API Key")
      .setDesc("可选。若第三方接口需要鉴权，会以 Bearer Token 发送。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setValue(this.plugin.settings.xhsApiKey)
          .onChange(async (value) => {
            this.plugin.settings.xhsApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("内容整理分类标签")
      .setDesc("用于分享链接整理的候选分类，逗号分隔。AI 会优先从这些标签里选择。")
      .addTextArea((text) => {
        text.inputEl.rows = 3;
        text
          .setValue(this.plugin.settings.contentCategories)
          .onChange(async (value) => {
            this.plugin.settings.contentCategories = value.trim() || DEFAULT_SETTINGS.contentCategories;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("wx-cli 路径")
      .setDesc("用于从本地微信数据导入文件传输助手链接。若 wx 已在 PATH 中，保持 wx 即可。")
      .addText((text) => text
        .setPlaceholder("wx")
        .setValue(this.plugin.settings.wxCliPath)
        .onChange(async (value) => {
          this.plugin.settings.wxCliPath = value.trim() || DEFAULT_SETTINGS.wxCliPath;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("微信会话名")
      .setDesc("默认读取文件传输助手。也可以换成你的知识收件箱群名。")
      .addText((text) => text
        .setPlaceholder("文件传输助手")
        .setValue(this.plugin.settings.wxSessionName)
        .onChange(async (value) => {
          this.plugin.settings.wxSessionName = value.trim() || DEFAULT_SETTINGS.wxSessionName;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("微信导入数量上限")
      .setDesc("防止一次读取太多聊天记录。")
      .addText((text) => text
        .setPlaceholder("2000")
        .setValue(String(this.plugin.settings.wxHistoryLimit))
        .onChange(async (value) => {
          const n = Number.parseInt(value, 10);
          this.plugin.settings.wxHistoryLimit = Number.isFinite(n) ? Math.max(100, Math.min(10000, n)) : DEFAULT_SETTINGS.wxHistoryLimit;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("每日自动刷新")
      .setDesc("Obsidian 打开且插件加载时，每天最多自动刷新一次。")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.githubAutoRefresh)
        .onChange(async (value) => {
          this.plugin.settings.githubAutoRefresh = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("DeepSeek API Key")
      .setDesc("用于把 GitHub 项目描述压缩成一句话中文简介。注意：该值会保存在插件设置数据里。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.deepseekApiKey)
          .onChange(async (value) => {
            this.plugin.settings.deepseekApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("DeepSeek Endpoint")
      .setDesc("默认使用 OpenAI 兼容 Chat Completions endpoint。")
      .addText((text) => text
        .setValue(this.plugin.settings.deepseekEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.deepseekEndpoint = value.trim() || DEFAULT_SETTINGS.deepseekEndpoint;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("DeepSeek Model")
      .setDesc("默认使用 deepseek-v4-pro。若你的账号模型名不同，可在这里替换。")
      .addText((text) => text
        .setValue(this.plugin.settings.deepseekModel)
        .onChange(async (value) => {
          this.plugin.settings.deepseekModel = value.trim() || DEFAULT_SETTINGS.deepseekModel;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("DeepSeek 提示词")
      .setDesc("用于把热点项目压缩成一句话简介。请要求模型只输出 JSON 数组。")
      .addTextArea((text) => {
        text.inputEl.rows = 5;
        text
          .setValue(this.plugin.settings.deepseekPrompt)
          .onChange(async (value) => {
            this.plugin.settings.deepseekPrompt = value.trim() || DEFAULT_SETTINGS.deepseekPrompt;
            await this.plugin.saveSettings();
          });
      });
  }
}

class LlmWikiDashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.activeTab = "dashboard";
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "LLM Wiki Dashboard";
  }

  getIcon() {
    return "bar-chart-3";
  }

  async onOpen() {
    await this.render();
  }

  async render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("llm-wiki-dashboard");

    const data = await this.plugin.collectDashboardData();
    const shell = root.createDiv({ cls: "lwd-shell" });
    this.renderSidebar(shell);
    const main = shell.createDiv({ cls: "lwd-main" });
    this.renderTopbar(main, data);
    if (this.activeTab === "hot") {
      this.renderGithubTop(main, data);
      this.renderBilibiliTop(main, data);
      this.renderXhsTop(main, data);
      return;
    }
    if (this.activeTab === "organizer") {
      this.renderContentOrganizer(main, data);
      return;
    }
    this.renderStats(main, data);
    this.renderPlan(main, data);
    this.renderTrends(main, data);
  }

  renderSidebar(shell) {
    const side = shell.createDiv({ cls: "lwd-sidebar" });
    const brand = side.createDiv({ cls: "lwd-brand-block" });
    brand.createDiv({ cls: "lwd-brand", text: "wiki." });
    const profile = brand.createDiv({ cls: "lwd-profile" });
    profile.createDiv({ cls: "lwd-profile-mark", text: "kb" });
    const profileCopy = profile.createDiv();
    profileCopy.createDiv({ cls: "lwd-profile-name", text: "knowledge base" });
    profileCopy.createDiv({ cls: "lwd-profile-meta", text: "llm wiki · codex" });

    side.createDiv({ cls: "lwd-nav-heading", text: "WORK" });
    const nav = side.createDiv({ cls: "lwd-nav" });
    const tabs = [
      ["dashboard", "Dashboard"],
      ["hot", "DeepSeek hot"],
      ["organizer", "内容整理"]
    ];

    for (const [id, label] of tabs) {
      const button = nav.createEl("button", { cls: "lwd-nav-button" });
      button.toggleClass("is-active", this.activeTab === id);
      button.createSpan({ cls: "lwd-nav-dot", text: "•" });
      button.createSpan({ cls: "lwd-nav-label", text: label });
      button.addEventListener("click", async () => {
        this.activeTab = id;
        await this.render();
      });
    }
  }

  renderTopbar(main, data) {
    const top = main.createDiv({ cls: "lwd-topbar" });
    top.createSpan({ text: "YOUR WIKI LIFE, MEASURED BY WHAT YOU ABSORB" });
    top.createSpan({ text: `REVIEWED ${data.todayKey}` });
  }

  renderStats(main, data) {
    const grid = main.createDiv({ cls: "lwd-stats" });
    const cards = [
      ["DAILY RAW", data.raw.today, "今日新增原始资料", "neutral"],
      ["MONTH RAW", data.raw.month, "本月新增原始资料", "neutral"],
      ["RAW TOTAL", data.raw.total, "当前 Raw 文件总量", "neutral"],
      ["WIKI CONVERSION", `${data.conversion.rate}%`, `${data.sources.cards} source cards / ${data.raw.total} raw`, data.conversion.rate >= 60 ? "good" : "warn"],
      ["TODAY DONE", `${data.tasks.todayRate}%`, `${data.tasks.todayDone}/${data.tasks.todayTotal} daily tasks`, data.tasks.todayRate >= 70 ? "good" : "warn"],
      ["MONTH DONE", `${data.tasks.monthRate}%`, `${data.tasks.monthDone}/${data.tasks.monthTotal} monthly tasks`, data.tasks.monthRate >= 70 ? "good" : "warn"],
      ["OPEN QUESTIONS", data.openQuestions, "等待澄清或消化的问题", data.openQuestions ? "danger" : "good"],
      ["HEALTH SCORE", data.health.score, data.health.note, data.health.score >= 80 ? "good" : "warn"]
    ];

    for (const [label, value, note, tone] of cards) {
      const card = grid.createDiv({ cls: `lwd-stat lwd-${tone}` });
      card.createDiv({ cls: "lwd-label", text: label });
      card.createDiv({ cls: "lwd-value", text: String(value) });
      card.createDiv({ cls: "lwd-note", text: note });
    }
  }

  renderGithubTop(main, data) {
    const section = main.createDiv({ cls: "lwd-github" });
    const head = section.createDiv({ cls: "lwd-github-head" });
    const title = head.createDiv();
    title.createDiv({ cls: "lwd-section-title", text: "GITHUB STAR RADAR" });
    title.createDiv({
      cls: "lwd-github-subtitle",
      text: `主题：${this.plugin.settings.githubTopic || "ai"} · ${this.plugin.githubWindowLabel()} · 按 stars 降序 · 简介：DeepSeek`
    });
    const actions = head.createDiv({ cls: "lwd-github-actions" });
    const settings = actions.createEl("button", { text: "SETTINGS" });
    settings.addEventListener("click", () => {
      this.plugin.openSettings();
    });
    const refresh = actions.createEl("button", { text: "REFRESH" });
    refresh.addEventListener("click", async () => {
      refresh.disabled = true;
      refresh.setText("FETCHING");
      try {
        await this.plugin.refreshGithubDailyTop(true);
        await this.render();
      } finally {
        refresh.disabled = false;
      }
    });

    const items = data.githubTop.items || [];
    const meta = section.createDiv({ cls: "lwd-github-meta" });
    meta.createSpan({ text: data.githubTop.lastFetched ? `LAST FETCHED ${data.githubTop.lastFetched}` : "尚未刷新" });
    meta.createSpan({ text: `规则：${data.githubTop.query || this.plugin.buildGithubQuery().queryText}` });

    const list = section.createDiv({ cls: "lwd-github-list" });
    if (!items.length) {
      list.createDiv({ cls: "lwd-empty", text: "暂无 GitHub 项目。请在插件设置中配置 DeepSeek API Key 后点击 REFRESH。" });
      return;
    }
    items.forEach((item, index) => {
      const row = list.createDiv({ cls: "lwd-github-row" });
      row.createDiv({ cls: "lwd-github-rank", text: String(index + 1).padStart(2, "0") });
      const body = row.createDiv({ cls: "lwd-github-body" });
      body.createEl("a", { cls: "lwd-github-name", text: item.full_name || item.name, attr: { href: item.html_url || item.url, target: "_blank", rel: "noopener" } });
      body.createDiv({ cls: "lwd-github-desc", text: item.one_liner || item.description || "暂无简介" });
      const stats = row.createDiv({ cls: "lwd-github-stats" });
      stats.createSpan({ text: `★ ${item.stargazers_count || 0}` });
      stats.createSpan({ text: item.language || "unknown" });
    });
  }

  renderBilibiliTop(main, data) {
    const section = main.createDiv({ cls: "lwd-github" });
    const head = section.createDiv({ cls: "lwd-github-head" });
    const title = head.createDiv();
    title.createDiv({ cls: "lwd-section-title", text: "BILIBILI DAILY TOP" });
    title.createDiv({
      cls: "lwd-github-subtitle",
      text: `主题：${this.plugin.settings.bilibiliTopic || "AI"} · 数据源：Bilibili Search · 简介：DeepSeek`
    });
    const actions = head.createDiv({ cls: "lwd-github-actions" });
    const settings = actions.createEl("button", { text: "SETTINGS" });
    settings.addEventListener("click", () => this.plugin.openSettings());
    const refresh = actions.createEl("button", { text: "REFRESH" });
    refresh.addEventListener("click", async () => {
      refresh.disabled = true;
      refresh.setText("FETCHING");
      try {
        await this.plugin.refreshBilibiliDailyTop(true);
        await this.render();
      } finally {
        refresh.disabled = false;
      }
    });

    const items = data.bilibiliTop.items || [];
    const meta = section.createDiv({ cls: "lwd-github-meta" });
    meta.createSpan({ text: data.bilibiliTop.lastFetched ? `LAST FETCHED ${data.bilibiliTop.lastFetched}` : "尚未刷新" });
    meta.createSpan({ text: `排序：${this.plugin.settings.bilibiliOrder || "pubdate"}` });
    this.renderHotList(section, items, "暂无 B站结果。请检查关键词后点击 REFRESH。");
  }

  renderXhsTop(main, data) {
    const section = main.createDiv({ cls: "lwd-github" });
    const head = section.createDiv({ cls: "lwd-github-head" });
    const title = head.createDiv();
    title.createDiv({ cls: "lwd-section-title", text: "XIAOHONGSHU DAILY TOP" });
    title.createDiv({
      cls: "lwd-github-subtitle",
      text: `主题：${this.plugin.settings.xhsTopic || "AI"} · 数据源：外部接口 · 简介：DeepSeek`
    });
    const actions = head.createDiv({ cls: "lwd-github-actions" });
    const settings = actions.createEl("button", { text: "SETTINGS" });
    settings.addEventListener("click", () => this.plugin.openSettings());
    const refresh = actions.createEl("button", { text: "REFRESH" });
    refresh.addEventListener("click", async () => {
      refresh.disabled = true;
      refresh.setText("FETCHING");
      try {
        await this.plugin.refreshXhsDailyTop(true);
        await this.render();
      } finally {
        refresh.disabled = false;
      }
    });

    const items = data.xhsTop.items || [];
    const meta = section.createDiv({ cls: "lwd-github-meta" });
    meta.createSpan({ text: data.xhsTop.lastFetched ? `LAST FETCHED ${data.xhsTop.lastFetched}` : "尚未刷新" });
    meta.createSpan({ text: this.plugin.settings.xhsEndpoint ? "外部接口已配置" : "需配置小红书 API Endpoint" });
    this.renderHotList(section, items, "暂无小红书结果。小红书需要配置第三方或自建 API Endpoint。");
  }

  renderHotList(section, items, emptyText) {
    const list = section.createDiv({ cls: "lwd-github-list" });
    if (!items.length) {
      list.createDiv({ cls: "lwd-empty", text: emptyText });
      return;
    }
    items.forEach((item, index) => {
      const row = list.createDiv({ cls: "lwd-github-row" });
      row.createDiv({ cls: "lwd-github-rank", text: String(index + 1).padStart(2, "0") });
      const body = row.createDiv({ cls: "lwd-github-body" });
      body.createEl("a", { cls: "lwd-github-name", text: item.full_name || item.title || item.name, attr: { href: item.html_url || item.url, target: "_blank", rel: "noopener" } });
      body.createDiv({ cls: "lwd-github-desc", text: item.one_liner || item.description || "暂无简介" });
      const stats = row.createDiv({ cls: "lwd-github-stats" });
      stats.createSpan({ text: item.scoreLabel || `★ ${item.score || item.stargazers_count || 0}` });
      stats.createSpan({ text: item.source || item.language || "unknown" });
    });
  }

  renderContentOrganizer(main, data) {
    const section = main.createDiv({ cls: "lwd-organizer" });
    const head = section.createDiv({ cls: "lwd-github-head" });
    const title = head.createDiv();
    title.createDiv({ cls: "lwd-section-title", text: "CONTENT ORGANIZER" });
    title.createDiv({
      cls: "lwd-github-subtitle",
      text: "从微信文件传输助手复制链接，按日期、分类和一句话简介整理"
    });
    const actions = head.createDiv({ cls: "lwd-github-actions" });
    const settings = actions.createEl("button", { text: "SETTINGS" });
    settings.addEventListener("click", () => this.plugin.openSettings());
    const classify = actions.createEl("button", { text: "CLASSIFY" });
    classify.addEventListener("click", async () => {
      classify.disabled = true;
      classify.setText("RUNNING");
      try {
        await this.plugin.classifyContentInbox(this.organizerStart, this.organizerEnd);
        await this.render();
      } finally {
        classify.disabled = false;
      }
    });
    const importWechat = actions.createEl("button", { text: "IMPORT WECHAT" });
    importWechat.addEventListener("click", async () => {
      importWechat.disabled = true;
      importWechat.setText("IMPORTING");
      try {
        const count = await this.plugin.importWechatLinks(this.organizerStart, this.organizerEnd);
        new Notice(`Imported ${count} links from WeChat.`);
        await this.render();
      } finally {
        importWechat.disabled = false;
      }
    });

    const today = data.todayKey;
    if (!this.organizerEnd) this.organizerEnd = today;
    if (!this.organizerStart) this.organizerStart = rangeDefaultStart(10);

    const filters = section.createDiv({ cls: "lwd-organizer-filters" });
    filters.createSpan({ text: "START" });
    const startInput = filters.createEl("input", { attr: { type: "date", value: this.organizerStart } });
    filters.createSpan({ text: "END" });
    const endInput = filters.createEl("input", { attr: { type: "date", value: this.organizerEnd } });
    const apply = filters.createEl("button", { text: "APPLY" });
    apply.addEventListener("click", async () => {
      this.organizerStart = startInput.value || this.organizerStart;
      this.organizerEnd = endInput.value || this.organizerEnd;
      if (this.organizerStart > this.organizerEnd) {
        const temp = this.organizerStart;
        this.organizerStart = this.organizerEnd;
        this.organizerEnd = temp;
      }
      await this.render();
    });

    const importer = section.createDiv({ cls: "lwd-organizer-import" });
    const importDate = importer.createEl("input", { attr: { type: "date", value: today } });
    const textarea = importer.createEl("textarea", {
      attr: {
        placeholder: "把文件传输助手里复制出来的链接粘贴到这里。可以一行一个，也可以混在文字里。"
      }
    });
    const importBtn = importer.createEl("button", { text: "IMPORT LINKS" });
    importBtn.addEventListener("click", async () => {
      const count = await this.plugin.importContentLinks(textarea.value, importDate.value || today);
      textarea.value = "";
      new Notice(`Imported ${count} links.`);
      await this.render();
    });

    const items = data.contentInbox.items
      .filter((item) => inDateRange(item.sharedDate || item.created, this.organizerStart, this.organizerEnd))
      .sort((a, b) => (b.sharedDate || b.created || "").localeCompare(a.sharedDate || a.created || ""));
    const categories = groupBy(items, (item) => item.category || "待分类");
    const categoryNames = Object.keys(categories).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
    const list = section.createDiv({ cls: "lwd-organizer-list" });
    if (!categoryNames.length) {
      list.createDiv({ cls: "lwd-empty", text: "当前日期范围内还没有链接。先从微信文件传输助手复制链接后导入。" });
      return;
    }
    for (const category of categoryNames) {
      const group = list.createDiv({ cls: "lwd-organizer-group" });
      const groupHead = group.createDiv({ cls: "lwd-organizer-category" });
      groupHead.createSpan({ text: category });
      groupHead.createSpan({ text: `${categories[category].length} LINKS` });
      for (const item of categories[category]) {
        const row = group.createDiv({ cls: "lwd-organizer-row" });
        row.createDiv({ cls: "lwd-organizer-date", text: item.sharedDate || item.created || "" });
        const body = row.createDiv({ cls: "lwd-organizer-body" });
        body.createEl("a", { cls: "lwd-github-name", text: item.title || item.url, attr: { href: item.url, target: "_blank", rel: "noopener" } });
        body.createDiv({ cls: "lwd-github-desc", text: item.one_liner || item.description || "等待整理简介" });
        row.createDiv({ cls: "lwd-github-stats", text: item.source || this.plugin.detectLinkSource(item.url) });
      }
    }
  }

  renderPlan(main, data) {
    const header = main.createDiv({ cls: "lwd-plan-head" });
    header.createDiv({ cls: "lwd-section-title", text: "PLAN BOARD" });
    const historyButton = header.createEl("button", { text: "HISTORY" });
    historyButton.addEventListener("click", () => {
      new TaskHistoryModal(this.plugin.app, this.plugin).open();
    });
    const wrap = main.createDiv({ cls: "lwd-plan" });
    this.renderTaskPanel(wrap, "TODAY PLAN", "daily", data.tasks.daily);
    this.renderTaskPanel(wrap, "WEEK GOALS", "weekly", data.tasks.weekly);
    this.renderTaskPanel(wrap, "MONTH GOALS", "monthly", data.tasks.monthly);
    this.renderTaskPanel(wrap, "YEAR GOALS", "yearly", data.tasks.yearly);
  }

  renderTaskPanel(parent, title, scope, tasks) {
    const panel = parent.createDiv({ cls: "lwd-task-panel" });
    panel.createDiv({ cls: "lwd-section-title", text: title });

    const form = panel.createDiv({ cls: "lwd-task-form" });
    const placeholders = {
      daily: "添加今日任务",
      weekly: "添加本周目标",
      monthly: "添加月度目标",
      yearly: "添加年度目标"
    };
    const input = form.createEl("input", { attr: { type: "text", placeholder: placeholders[scope] || "添加任务" } });
    const select = form.createEl("select");
    for (const item of ["raw", "wiki", "question", "health", "output"]) {
      select.createEl("option", { text: item, attr: { value: item } });
    }
    const button = form.createEl("button", { text: "ADD" });
    button.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;
      await this.plugin.addTask(scope, text, classifyTaskType(select.value));
      input.value = "";
      await this.render();
    });
    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      button.click();
    });

    const list = panel.createDiv({ cls: "lwd-task-list" });
    if (!tasks.length) {
      list.createDiv({ cls: "lwd-empty", text: "暂无任务" });
    }
    for (const task of tasks) {
      const row = list.createDiv({ cls: `lwd-task ${task.done ? "is-done" : ""}` });
      const checkbox = row.createEl("input", { attr: { type: "checkbox" } });
      checkbox.checked = Boolean(task.done);
      checkbox.addEventListener("change", async () => {
        await this.plugin.toggleTask(scope, task.id, checkbox.checked);
        await this.render();
      });
      row.createSpan({ cls: "lwd-task-text", text: task.text });
      row.createSpan({ cls: "lwd-task-type", text: task.type || "wiki" });
      const del = row.createEl("button", { text: "×", cls: "lwd-delete" });
      del.addEventListener("click", async () => {
        await this.plugin.deleteTask(scope, task.id);
        await this.render();
      });
    }
  }

  renderTrends(main, data) {
    const area = main.createDiv({ cls: "lwd-trends" });
    const head = area.createDiv({ cls: "lwd-trend-head" });
    head.createDiv({ cls: "lwd-section-title", text: "RAW & WIKI — LAST 30 DAYS" });
    head.createDiv({ cls: "lwd-trend-note", text: data.health.note });

    const axis = area.createDiv({ cls: "lwd-axis-note" });
    axis.createSpan({ text: "X轴：最近 30 天日期，从左到右接近今天" });
    axis.createSpan({ text: "Y轴：当天文件数量，柱越高数量越多" });

    const max = Math.max(1, ...data.trend.map((d) => Math.max(d.raw, d.wiki)));
    const chartWrap = area.createDiv({ cls: "lwd-chart-wrap" });
    const yAxis = chartWrap.createDiv({ cls: "lwd-y-axis" });
    yAxis.createSpan({ text: String(max) });
    yAxis.createSpan({ text: "0" });
    const chartArea = chartWrap.createDiv({ cls: "lwd-chart-area" });
    const chart = chartArea.createDiv({ cls: "lwd-chart" });
    for (const point of data.trend) {
      const group = chart.createDiv({ cls: "lwd-bar-group", attr: { title: `${point.date}: Raw ${point.raw}, Wiki ${point.wiki}` } });
      group.createDiv({ cls: "lwd-bar lwd-raw-bar", attr: { style: `height:${point.raw ? Math.max(4, (point.raw / max) * 100) : 4}%` } });
      group.createDiv({ cls: "lwd-bar lwd-wiki-bar", attr: { style: `height:${point.wiki ? Math.max(4, (point.wiki / max) * 100) : 4}%` } });
    }
    const xAxis = chartArea.createDiv({ cls: "lwd-x-axis" });
    xAxis.createSpan({ text: data.trend[0]?.day || "" });
    xAxis.createSpan({ text: data.trend[Math.floor(data.trend.length / 2)]?.day || "" });
    xAxis.createSpan({ text: "TODAY" });

    const legend = area.createDiv({ cls: "lwd-legend" });
    legend.createSpan({ text: "■ Raw：当天新增 10_Raw 文件数" });
    legend.createSpan({ text: "■ Wiki：当天更新 20_Wiki 页面数" });
  }
}

module.exports = class LlmWikiDashboardPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    await this.ensurePlanFile();
    await this.ensureGithubTopFile();
    await this.ensureBilibiliTopFile();
    await this.ensureXhsTopFile();
    await this.ensureContentInboxFile();
    this.registerView(VIEW_TYPE, (leaf) => new LlmWikiDashboardView(leaf, this));
    this.addSettingTab(new LlmWikiDashboardSettingTab(this.app, this));
    this.addRibbonIcon("bar-chart-3", "Open LLM Wiki Dashboard", () => this.activateView());
    this.addCommand({
      id: "open-llm-wiki-dashboard",
      name: "Open LLM Wiki Dashboard",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "refresh-github-daily-top",
      name: "Refresh GitHub Star Radar",
      callback: async () => {
        await this.refreshGithubDailyTop(true);
        new Notice("GitHub Star Radar refreshed.");
      }
    });
    this.addCommand({
      id: "refresh-bilibili-daily-top",
      name: "Refresh Bilibili Daily Top",
      callback: async () => {
        await this.refreshBilibiliDailyTop(true);
      }
    });
    this.addCommand({
      id: "refresh-xiaohongshu-daily-top",
      name: "Refresh Xiaohongshu Daily Top",
      callback: async () => {
        await this.refreshXhsDailyTop(true);
      }
    });
    this.addCommand({
      id: "import-wechat-links",
      name: "Import WeChat Links to Content Organizer",
      callback: async () => {
        const count = await this.importWechatLinks(rangeDefaultStart(10), dateKey(new Date()));
        new Notice(`Imported ${count} links from WeChat.`);
      }
    });
    this.registerEvent(this.app.workspace.on("layout-ready", () => {
      this.maybeAutoRefreshHotSources();
    }));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  openSettings() {
    if (this.app.setting?.open) this.app.setting.open();
    if (this.app.setting?.openTabById) {
      this.app.setting.openTabById(this.manifest.id);
    }
  }

  async ensurePlanFile() {
    if (!(await this.app.vault.adapter.exists(PLAN_PATH))) {
      await this.app.vault.create(PLAN_PATH, JSON.stringify({ daily: [], weekly: [], monthly: [], yearly: [] }, null, 2));
    }
  }

  async ensureGithubTopFile() {
    if (!(await this.app.vault.adapter.exists(GITHUB_TOP_PATH))) {
      await this.app.vault.create(GITHUB_TOP_PATH, JSON.stringify({ lastFetched: "", topic: this.settings.githubTopic, items: [] }, null, 2));
    }
  }

  async ensureBilibiliTopFile() {
    if (!(await this.app.vault.adapter.exists(BILIBILI_TOP_PATH))) {
      await this.app.vault.create(BILIBILI_TOP_PATH, JSON.stringify({ lastFetched: "", topic: this.settings.bilibiliTopic, items: [] }, null, 2));
    }
  }

  async ensureXhsTopFile() {
    if (!(await this.app.vault.adapter.exists(XHS_TOP_PATH))) {
      await this.app.vault.create(XHS_TOP_PATH, JSON.stringify({ lastFetched: "", topic: this.settings.xhsTopic, items: [] }, null, 2));
    }
  }

  async ensureContentInboxFile() {
    if (!(await this.app.vault.adapter.exists(CONTENT_INBOX_PATH))) {
      await this.app.vault.create(CONTENT_INBOX_PATH, JSON.stringify({ items: [] }, null, 2));
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async loadPlan() {
    await this.ensurePlanFile();
    try {
      const file = this.app.vault.getAbstractFileByPath(PLAN_PATH);
      const text = await this.app.vault.read(file);
      const parsed = JSON.parse(text || "{}");
      return {
        daily: Array.isArray(parsed.daily) ? parsed.daily : [],
        weekly: Array.isArray(parsed.weekly) ? parsed.weekly : [],
        monthly: Array.isArray(parsed.monthly) ? parsed.monthly : [],
        yearly: Array.isArray(parsed.yearly) ? parsed.yearly : []
      };
    } catch (error) {
      new Notice("Dashboard plan data could not be read. A fresh plan was used.");
      return { daily: [], weekly: [], monthly: [], yearly: [] };
    }
  }

  async savePlan(plan) {
    const file = this.app.vault.getAbstractFileByPath(PLAN_PATH);
    await this.app.vault.modify(file, JSON.stringify(plan, null, 2));
  }

  async addTask(scope, text, type) {
    const plan = await this.loadPlan();
    const now = new Date();
    const task = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      type,
      done: false,
      created: dateKey(now),
      date: scope === "daily" ? dateKey(now) : undefined,
      week: scope === "weekly" ? weekKey(now) : undefined,
      month: scope === "monthly" ? monthKey(now) : undefined,
      year: scope === "yearly" ? yearKey(now) : undefined
    };
    plan[scope].push(task);
    await this.savePlan(plan);
  }

  async toggleTask(scope, id, done) {
    const plan = await this.loadPlan();
    plan[scope] = plan[scope].map((task) => task.id === id ? { ...task, done, completed: done ? dateKey(new Date()) : undefined } : task);
    await this.savePlan(plan);
  }

  async deleteTask(scope, id) {
    const plan = await this.loadPlan();
    plan[scope] = plan[scope].filter((task) => task.id !== id);
    await this.savePlan(plan);
  }

  async collectDashboardData() {
    const now = new Date();
    const today = dateKey(now);
    const month = monthKey(now);
    const week = weekKey(now);
    const year = yearKey(now);
    const files = this.app.vault.getFiles();

    const rawFiles = files.filter((file) => file.path.startsWith("10_Raw/") && !isIgnoredRaw(file.path));
    const wikiFiles = files.filter((file) => file.path.startsWith("20_Wiki/") && file.extension === "md");
    const sourceCards = files.filter((file) => file.path.startsWith("20_Wiki/Sources/") && file.extension === "md");

    const rawToday = rawFiles.filter((file) => isSameDay(file.stat.ctime, today)).length;
    const rawMonth = rawFiles.filter((file) => isSameMonth(file.stat.ctime, month)).length;
    const wikiToday = wikiFiles.filter((file) => isSameDay(file.stat.mtime, today)).length;

    const sources = await this.readSourcesCsv();
    const convertedMarked = sources.filter((row) => /ingested|converted|done|stable|growing/i.test(row.status || "")).length;
    const conversionRate = pct(sourceCards.length, rawFiles.length);
    const openQuestions = await this.countOpenQuestions();
    const plan = await this.loadPlan();
    const githubTop = await this.loadGithubTop();
    const bilibiliTop = await this.loadBilibiliTop();
    const xhsTop = await this.loadXhsTop();
    const contentInbox = await this.loadContentInbox();

    const dailyTasks = plan.daily.filter((task) => task.date === today);
    const weeklyTasks = plan.weekly.filter((task) => task.week === week);
    const monthlyTasks = plan.monthly.filter((task) => task.month === month);
    const yearlyTasks = plan.yearly.filter((task) => task.year === year);
    const monthTasks = [
      ...plan.daily.filter((task) => task.created && task.created.startsWith(month)),
      ...monthlyTasks
    ];

    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      trend.push({
        date: key,
        day: key.slice(5),
        raw: rawFiles.filter((file) => isSameDay(file.stat.ctime, key)).length,
        wiki: wikiFiles.filter((file) => isSameDay(file.stat.mtime, key)).length
      });
    }

    const backlog = Math.max(0, rawFiles.length - sourceCards.length);
    const recentWiki = wikiFiles.filter((file) => Date.now() - file.stat.mtime <= 7 * 86400000).length;
    let healthScore = 100;
    if (backlog > 0) healthScore -= Math.min(35, backlog * 5);
    if (openQuestions > 0) healthScore -= Math.min(25, openQuestions * 3);
    if (recentWiki === 0) healthScore -= 20;
    healthScore = Math.max(0, healthScore);

    const healthNote = backlog > 0
      ? `${backlog} raw items may need source cards`
      : openQuestions > 0
        ? `${openQuestions} open questions waiting`
        : "knowledge flow looks steady";

    return {
      todayKey: today,
      monthKey: month,
      yearKey: year,
      raw: { today: rawToday, month: rawMonth, total: rawFiles.length },
      wiki: { today: wikiToday, total: wikiFiles.length },
      sources: { cards: sourceCards.length, rows: sources.length, convertedMarked },
      conversion: { rate: conversionRate, convertedMarked },
      openQuestions,
      tasks: {
        daily: dailyTasks,
        weekly: weeklyTasks,
        monthly: monthlyTasks,
        yearly: yearlyTasks,
        todayTotal: dailyTasks.length,
        todayDone: dailyTasks.filter((task) => task.done).length,
        todayRate: pct(dailyTasks.filter((task) => task.done).length, dailyTasks.length),
        monthTotal: monthTasks.length,
        monthDone: monthTasks.filter((task) => task.done).length,
        monthRate: pct(monthTasks.filter((task) => task.done).length, monthTasks.length)
      },
      trend,
      githubTop,
      bilibiliTop,
      xhsTop,
      contentInbox,
      health: { score: healthScore, note: healthNote }
    };
  }

  async loadGithubTop() {
    await this.ensureGithubTopFile();
    const file = this.app.vault.getAbstractFileByPath(GITHUB_TOP_PATH);
    const text = await this.app.vault.read(file);
    return Object.assign({ lastFetched: "", topic: this.settings.githubTopic, items: [] }, safeJsonParse(text, {}));
  }

  async saveGithubTop(data) {
    await this.ensureGithubTopFile();
    const file = this.app.vault.getAbstractFileByPath(GITHUB_TOP_PATH);
    await this.app.vault.modify(file, JSON.stringify(data, null, 2));
  }

  async loadBilibiliTop() {
    await this.ensureBilibiliTopFile();
    const file = this.app.vault.getAbstractFileByPath(BILIBILI_TOP_PATH);
    const text = await this.app.vault.read(file);
    return Object.assign({ lastFetched: "", topic: this.settings.bilibiliTopic, items: [] }, safeJsonParse(text, {}));
  }

  async saveBilibiliTop(data) {
    await this.ensureBilibiliTopFile();
    const file = this.app.vault.getAbstractFileByPath(BILIBILI_TOP_PATH);
    await this.app.vault.modify(file, JSON.stringify(data, null, 2));
  }

  async loadXhsTop() {
    await this.ensureXhsTopFile();
    const file = this.app.vault.getAbstractFileByPath(XHS_TOP_PATH);
    const text = await this.app.vault.read(file);
    return Object.assign({ lastFetched: "", topic: this.settings.xhsTopic, items: [] }, safeJsonParse(text, {}));
  }

  async saveXhsTop(data) {
    await this.ensureXhsTopFile();
    const file = this.app.vault.getAbstractFileByPath(XHS_TOP_PATH);
    await this.app.vault.modify(file, JSON.stringify(data, null, 2));
  }

  async loadContentInbox() {
    await this.ensureContentInboxFile();
    const file = this.app.vault.getAbstractFileByPath(CONTENT_INBOX_PATH);
    const text = await this.app.vault.read(file);
    const parsed = safeJsonParse(text, {});
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  }

  async saveContentInbox(data) {
    await this.ensureContentInboxFile();
    const file = this.app.vault.getAbstractFileByPath(CONTENT_INBOX_PATH);
    await this.app.vault.modify(file, JSON.stringify({ items: data.items || [] }, null, 2));
  }

  async maybeAutoRefreshHotSources() {
    if (!this.settings.githubAutoRefresh) return;
    const today = dateKey(new Date());
    const jobs = [
      {
        name: "GitHub star radar",
        load: () => this.loadGithubTop(),
        stale: (current) => current.lastFetched !== today || current.topic !== this.settings.githubTopic || current.windowDays !== this.settings.githubTimeWindowDays,
        refresh: () => this.refreshGithubDailyTop(false)
      },
      {
        name: "Bilibili daily top",
        load: () => this.loadBilibiliTop(),
        stale: (current) => current.lastFetched !== today || current.topic !== this.settings.bilibiliTopic,
        refresh: () => this.refreshBilibiliDailyTop(false)
      },
      {
        name: "Xiaohongshu daily top",
        load: () => this.loadXhsTop(),
        stale: (current) => Boolean(this.settings.xhsEndpoint) && (current.lastFetched !== today || current.topic !== this.settings.xhsTopic),
        refresh: () => this.refreshXhsDailyTop(false)
      }
    ];
    for (const job of jobs) {
      try {
        const current = await job.load();
        if (job.stale(current)) await job.refresh();
      } catch (error) {
        console.warn(`${job.name} auto refresh failed`, error);
      }
    }
  }

  async refreshGithubDailyTop(showNotice) {
    const { topic, since, queryText } = this.buildGithubQuery();
    const topN = this.settings.githubTopN || 5;
    const query = encodeURIComponent(queryText);
    const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${topN}`;
    const response = await requestUrl({
      url,
      method: "GET",
      headers: {
        "Accept": "application/vnd.github+json"
      }
    });
    const repos = (response.json.items || []).slice(0, topN).map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description || "",
      stargazers_count: repo.stargazers_count || 0,
      language: repo.language || "",
      topics: repo.topics || []
    }));

    const items = await this.enrichGithubRepos(repos);
    await this.saveGithubTop({
      lastFetched: dateKey(new Date()),
      topic,
      windowDays: this.settings.githubTimeWindowDays || DEFAULT_SETTINGS.githubTimeWindowDays,
      query: queryText,
      items
    });
    if (showNotice) new Notice(`GitHub Star Radar refreshed: ${topic}`);
  }

  buildGithubQuery() {
    const topic = this.settings.githubTopic || "ai";
    const days = this.settings.githubTimeWindowDays || DEFAULT_SETTINGS.githubTimeWindowDays;
    const date = new Date();
    date.setDate(date.getDate() - days);
    const since = dateKey(date);
    const queryText = (this.settings.githubSearchRule || DEFAULT_SETTINGS.githubSearchRule)
      .replaceAll("{topic}", topic)
      .replaceAll("{since}", since);
    return { topic, since, queryText };
  }

  githubWindowLabel() {
    const days = this.settings.githubTimeWindowDays || DEFAULT_SETTINGS.githubTimeWindowDays;
    if (days === 30) return "近一月";
    if (days === 90) return "近三月";
    if (days === 180) return "近半年";
    if (days === 365) return "近一年";
    return `近 ${days} 天`;
  }

  async enrichGithubRepos(repos) {
    if (!repos.length) return [];
    if (!this.settings.deepseekApiKey) {
      return repos.map((repo) => ({
        ...repo,
        one_liner: repo.description || "GitHub 新增热门项目，尚未配置 DeepSeek 生成简介。"
      }));
    }
    const prompt = repos.map((repo, index) => `${index + 1}. ${repo.full_name}\nURL: ${repo.html_url}\nDescription: ${repo.description || "N/A"}\nLanguage: ${repo.language || "N/A"}\nTopics: ${(repo.topics || []).join(", ") || "N/A"}`).join("\n\n");
    const response = await requestUrl({
      url: this.settings.deepseekEndpoint,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.settings.deepseekApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.settings.deepseekModel,
        messages: [
          { role: "system", content: this.settings.deepseekPrompt || DEFAULT_SETTINGS.deepseekPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });
    const content = response.json?.choices?.[0]?.message?.content || "";
    const jsonText = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const summaries = safeJsonParse(jsonText, []);
    const byName = new Map(Array.isArray(summaries) ? summaries.map((item) => [item.full_name, item.one_liner]) : []);
    return repos.map((repo) => ({
      ...repo,
      one_liner: byName.get(repo.full_name) || repo.description || "暂无简介"
    }));
  }

  async refreshBilibiliDailyTop(showNotice) {
    const topic = this.settings.bilibiliTopic || "AI";
    const topN = this.settings.bilibiliTopN || 5;
    const order = this.settings.bilibiliOrder || "pubdate";
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(topic)}&order=${encodeURIComponent(order)}&page=1`;
    const response = await requestUrl({
      url,
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Referer": "https://search.bilibili.com/",
        "Origin": "https://search.bilibili.com"
      }
    });
    const rows = response.json?.data?.result || [];
    const items = rows.slice(0, topN).map((item) => ({
      title: this.stripHtml(item.title || ""),
      full_name: this.stripHtml(item.title || ""),
      html_url: item.arcurl || `https://www.bilibili.com/video/${item.bvid || ""}`,
      description: this.stripHtml(item.description || ""),
      score: Number(item.play || 0),
      scoreLabel: `播放 ${item.play || 0}`,
      source: "bilibili",
      author: item.author || "",
      published: item.pubdate || ""
    }));
    const enriched = await this.enrichHotItems(items, "B站视频");
    await this.saveBilibiliTop({
      lastFetched: dateKey(new Date()),
      topic,
      query: topic,
      items: enriched
    });
    if (showNotice) new Notice(`Bilibili Daily Top refreshed: ${topic}`);
  }

  async refreshXhsDailyTop(showNotice) {
    const topic = this.settings.xhsTopic || "AI";
    const topN = this.settings.xhsTopN || 5;
    if (!this.settings.xhsEndpoint) {
      new Notice("请先配置小红书 API Endpoint。");
      return;
    }
    const url = this.settings.xhsEndpoint
      .replaceAll("{keyword}", encodeURIComponent(topic))
      .replaceAll("{limit}", String(topN));
    const headers = { "Accept": "application/json" };
    if (this.settings.xhsApiKey) headers.Authorization = `Bearer ${this.settings.xhsApiKey}`;
    const response = await requestUrl({ url, method: "GET", headers });
    const rawItems = Array.isArray(response.json) ? response.json : (response.json?.items || response.json?.data || []);
    const items = rawItems.slice(0, topN).map((item) => ({
      title: item.title || item.name || item.note_title || "小红书笔记",
      full_name: item.title || item.name || item.note_title || "小红书笔记",
      html_url: item.url || item.link || item.note_url || "",
      description: item.description || item.desc || item.content || "",
      score: item.likes || item.like_count || item.score || 0,
      scoreLabel: `热度 ${item.likes || item.like_count || item.score || 0}`,
      source: "xiaohongshu",
      author: item.author || item.nickname || ""
    }));
    const enriched = await this.enrichHotItems(items, "小红书笔记");
    await this.saveXhsTop({
      lastFetched: dateKey(new Date()),
      topic,
      query: url,
      items: enriched
    });
    if (showNotice) new Notice(`Xiaohongshu Daily Top refreshed: ${topic}`);
  }

  async enrichHotItems(items, sourceName) {
    if (!items.length || !this.settings.deepseekApiKey) return items;
    const prompt = items.map((item, index) => `${index + 1}. ${item.full_name || item.title}\nURL: ${item.html_url || "N/A"}\nDescription: ${item.description || "N/A"}\nSource: ${sourceName}`).join("\n\n");
    const response = await requestUrl({
      url: this.settings.deepseekEndpoint,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.settings.deepseekApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.settings.deepseekModel,
        messages: [
          { role: "system", content: this.settings.deepseekPrompt || DEFAULT_SETTINGS.deepseekPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });
    const content = response.json?.choices?.[0]?.message?.content || "";
    const jsonText = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const summaries = safeJsonParse(jsonText, []);
    const byName = new Map(Array.isArray(summaries) ? summaries.map((item) => [item.full_name, item.one_liner]) : []);
    return items.map((item) => ({
      ...item,
      one_liner: byName.get(item.full_name) || item.description || "暂无简介"
    }));
  }

  async importContentLinks(text, sharedDate) {
    const urls = this.extractUrls(text);
    if (!urls.length) return 0;
    const inbox = await this.loadContentInbox();
    const existing = new Set(inbox.items.map((item) => item.url));
    const additions = [];
    for (const url of urls) {
      if (existing.has(url)) continue;
      const meta = await this.fetchLinkMetadata(url);
      additions.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        url,
        sharedDate,
        created: dateKey(new Date()),
        source: this.detectLinkSource(url),
        title: meta.title || url,
        description: meta.description || "",
        category: "",
        one_liner: ""
      });
    }
    inbox.items.push(...additions);
    await this.saveContentInbox(inbox);
    return additions.length;
  }

  async importWechatLinks(start, end) {
    if (!childProcess?.execFile) {
      new Notice("当前环境不能调用本地 wx-cli。请在 Obsidian 桌面端使用。");
      return 0;
    }
    const since = start || rangeDefaultStart(10);
    const until = end || dateKey(new Date());
    const args = [
      "history",
      this.settings.wxSessionName || DEFAULT_SETTINGS.wxSessionName,
      "--since",
      since,
      "--until",
      until,
      "--json",
      "--limit",
      String(this.settings.wxHistoryLimit || DEFAULT_SETTINGS.wxHistoryLimit)
    ];
    let stdout;
    try {
      stdout = await this.execWx(args);
    } catch (error) {
      try {
        stdout = await this.execWx(args.slice(0, -2));
      } catch (retryError) {
        new Notice(`wx-cli 导入失败：${retryError.message || retryError}`);
        return 0;
      }
    }
    const messages = this.parseWxHistory(stdout);
    if (!messages.length) {
      new Notice("wx-cli 没有返回可解析的聊天记录。");
      return 0;
    }
    const inbox = await this.loadContentInbox();
    const existing = new Set(inbox.items.map((item) => item.url));
    const additions = [];
    for (const message of messages) {
      const messageText = this.getWxMessageText(message);
      const urls = this.extractUrls(messageText);
      const sharedDate = this.getWxMessageDate(message) || since;
      for (const url of urls) {
        if (existing.has(url)) continue;
        existing.add(url);
        const meta = await this.fetchLinkMetadata(url);
        additions.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          url,
          sharedDate,
          created: dateKey(new Date()),
          source: this.detectLinkSource(url),
          title: meta.title || this.extractWxTitle(messageText) || url,
          description: meta.description || "",
          category: "",
          one_liner: ""
        });
      }
    }
    inbox.items.push(...additions);
    await this.saveContentInbox(inbox);
    return additions.length;
  }

  execWx(args) {
    return new Promise((resolve, reject) => {
      const configured = this.settings.wxCliPath || DEFAULT_SETTINGS.wxCliPath;
      const useCmd = process.platform === "win32" && /\.(cmd|bat)$/i.test(configured);
      const command = useCmd ? "cmd.exe" : configured;
      const commandArgs = useCmd ? ["/d", "/s", "/c", configured, ...args] : args;
      childProcess.execFile(
        command,
        commandArgs,
        { windowsHide: true, maxBuffer: 20 * 1024 * 1024, cwd: DEFAULT_COMMAND_CWD },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
            return;
          }
          resolve(stdout);
        }
      );
    });
  }

  parseWxHistory(stdout) {
    const text = String(stdout || "").trim();
    if (!text) return [];
    const parsed = safeJsonParse(text, null);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.messages)) return parsed.messages;
    if (Array.isArray(parsed?.data)) return parsed.data;
    if (Array.isArray(parsed?.items)) return parsed.items;
    return [];
  }

  getWxMessageText(message) {
    if (!message || typeof message === "string") return String(message || "");
    return [
      message.text,
      message.content,
      message.message,
      message.msg,
      message.title,
      message.description,
      message.url
    ].filter(Boolean).join("\n");
  }

  getWxMessageDate(message) {
    const raw = message?.date || message?.time || message?.datetime || message?.created_at || message?.create_time || message?.timestamp;
    if (!raw) return "";
    if (typeof raw === "number") {
      const ts = raw > 100000000000 ? raw : raw * 1000;
      return dateKey(new Date(ts));
    }
    const value = String(raw);
    const matched = value.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
    if (matched) {
      const [y, m, d] = matched[0].split(/[-/]/);
      return `${y}-${pad(m)}-${pad(d)}`;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateKey(date);
  }

  extractWxTitle(text) {
    return String(text || "").split(/\r?\n/).map((line) => line.trim()).find((line) => line && !/^https?:\/\//.test(line)) || "";
  }

  async classifyContentInbox(start, end) {
    const inbox = await this.loadContentInbox();
    const targets = inbox.items.filter((item) => inDateRange(item.sharedDate || item.created, start, end));
    if (!targets.length) return;
    const categories = this.getContentCategories();
    if (!this.settings.deepseekApiKey) {
      inbox.items = inbox.items.map((item) => targets.some((target) => target.id === item.id)
        ? this.fallbackClassifyContentItem(item, categories)
        : item);
      await this.saveContentInbox(inbox);
      new Notice("DeepSeek API Key 未配置，已使用关键词规则粗分类。");
      return;
    }
    const payload = targets.map((item, index) => `${index + 1}. URL: ${item.url}\nTitle: ${item.title || "N/A"}\nDescription: ${item.description || "N/A"}\nSource: ${item.source || "unknown"}`).join("\n\n");
    const system = `你是个人内容收件箱整理助手。请把分享链接按候选标签分类，并写一句中文简介。候选标签：${categories.join("、")}。只输出 JSON 数组，每项包含 url、category、one_liner。`;
    const response = await requestUrl({
      url: this.settings.deepseekEndpoint,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.settings.deepseekApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.settings.deepseekModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: payload }
        ],
        temperature: 0.2
      })
    });
    const content = response.json?.choices?.[0]?.message?.content || "";
    const jsonText = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const results = safeJsonParse(jsonText, []);
    const byUrl = new Map(Array.isArray(results) ? results.map((item) => [item.url, item]) : []);
    inbox.items = inbox.items.map((item) => {
      const result = byUrl.get(item.url);
      if (!result) return item;
      return {
        ...item,
        category: result.category || item.category || "待判断",
        one_liner: result.one_liner || item.one_liner || item.description
      };
    });
    await this.saveContentInbox(inbox);
    new Notice("内容链接整理完成。");
  }

  fallbackClassifyContentItem(item, categories) {
    const text = `${item.title || ""} ${item.description || ""} ${item.url || ""}`.toLowerCase();
    const match = categories.find((category) => {
      const key = category.toLowerCase();
      return key.split(/[-_\s/]+/).some((part) => part && text.includes(part));
    }) || (text.includes("video") || text.includes("bilibili") || text.includes("youtube") ? "AI-生成视频" : "待判断");
    return {
      ...item,
      category: categories.includes(match) ? match : "待判断",
      one_liner: item.one_liner || item.description || "已导入，等待进一步整理。"
    };
  }

  getContentCategories() {
    return String(this.settings.contentCategories || DEFAULT_SETTINGS.contentCategories)
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  extractUrls(text) {
    const matches = String(text || "").match(/https?:\/\/[^\s<>"'，。)）\]]+/g) || [];
    return Array.from(new Set(matches.map((url) => url.replace(/[.,;!?]+$/, ""))));
  }

  async fetchLinkMetadata(url) {
    const source = this.detectLinkSource(url);
    try {
      if (source === "bilibili") return await this.fetchBilibiliMetadata(url);
      if (source === "youtube") return await this.fetchYoutubeMetadata(url);
    } catch (error) {
      console.warn("metadata fetch failed", error);
    }
    return { title: "", description: "" };
  }

  async fetchBilibiliMetadata(url) {
    const bvid = (url.match(/BV[\w]+/i) || [])[0];
    if (!bvid) return { title: "", description: "" };
    const response = await requestUrl({
      url: `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
      method: "GET",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Referer": "https://www.bilibili.com/"
      }
    });
    const data = response.json?.data || {};
    return { title: data.title || "", description: data.desc || "" };
  }

  async fetchYoutubeMetadata(url) {
    const response = await requestUrl({
      url: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    return { title: response.json?.title || "", description: response.json?.author_name || "" };
  }

  detectLinkSource(url) {
    const value = String(url || "").toLowerCase();
    if (value.includes("bilibili.com") || value.includes("b23.tv")) return "bilibili";
    if (value.includes("youtube.com") || value.includes("youtu.be")) return "youtube";
    if (value.includes("xiaohongshu.com") || value.includes("xhslink.com")) return "xiaohongshu";
    if (value.includes("github.com")) return "github";
    return "web";
  }

  stripHtml(value) {
    return String(value || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").trim();
  }

  async readSourcesCsv() {
    const file = this.app.vault.getAbstractFileByPath(SOURCES_CSV);
    if (!file) return [];
    const text = await this.app.vault.read(file);
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length <= 1) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(",");
      const row = {};
      headers.forEach((header, index) => row[header] = (cells[index] || "").trim());
      return row;
    });
  }

  async countOpenQuestions() {
    const file = this.app.vault.getAbstractFileByPath(OPEN_QUESTIONS);
    if (!file) return 0;
    const text = await this.app.vault.read(file);
    return text.split(/\r?\n/).filter((line) => /^\s*-\s+/.test(line) && !/\[x\]/i.test(line)).length;
  }
};
