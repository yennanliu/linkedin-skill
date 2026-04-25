# LinkedIn 自動化技能套件（Claude Code）

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/yennanliu/linkedin-skill)

🌐 **[English README](README.md)** | 🌐 **[造訪專案](https://github.com/yennanliu/linkedin-skill)** | 🚀 **[快速開始](QUICKSTART.md)**

兩個使用 Playwright MCP 工具在 LinkedIn 上自動化操作的 Claude Code 技能。

---

## 技能一覽

| 技能 | 呼叫指令 | 說明 |
|------|----------|------|
| 自動投遞職缺 | `/linkedin-job-auto-apply` | 批次投遞 Easy Apply 職缺 |
| 個人檔案爬取 | `/linkedin-profile-scraper` | 依公司／國家／產業爬取個人檔案 |

---

## 技能一：自動投遞職缺

自動投遞 LinkedIn Easy Apply 職缺。

### 主要功能

- **僅限 Easy Apply**：僅針對 LinkedIn Easy Apply 職缺操作，非 Easy Apply 職缺自動略過
- **問卷自動填寫**：遇到申請表單時，以合理預設值填寫欄位，不跳過職缺
- **目標數量控制**：達到指定申請數量後自動停止
- **鍵盤控制**：按 P 暫停、R 繼續、Q 結束
- **頁面狀態顯示**：即時顯示申請進度的浮動視窗
- **智慧過濾**：自動略過已申請及非 Easy Apply 職缺
- **擬人化延遲**：隨機延遲，降低被偵測風險
- **完整錯誤處理**：單一職缺失敗不影響整體流程

### 設定參數

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `startPage` | 1 | 起始頁碼 |
| `targetApplications` | 20 | 目標申請數量 |
| `maxPages` | 20 | 最大處理頁數 |
| `searchKeywords` | 'software engineer' | 職缺搜尋關鍵字 |
| `location` | 'United States' | 工作地點 |
| `delayMin` | 2000 | 最短延遲時間（毫秒） |
| `delayMax` | 4000 | 最長延遲時間（毫秒） |

### 使用範例

```
# 單一職缺測試
使用 LinkedIn 自動投遞技能，測試投遞一份軟體工程師職缺

# 批次投遞遠端職缺
使用 LinkedIn 技能投遞美國遠端軟體工程師職缺，處理 3 頁，僅限 Easy Apply

# 精準搜尋
在舊金山灣區投遞後端開發職缺，目標 25 份申請，僅限 Easy Apply
```

### 問卷填寫預設值

當遇到申請表單時，系統會以下列預設值自動填寫：

| 欄位類型 | 預設行為 |
|----------|----------|
| 電話欄位 | 填入 `0000000000` |
| 年資／經驗欄位 | 填入 `3`（年） |
| 薪資欄位 | 填入 `0` |
| URL／網站欄位 | 填入 LinkedIn 個人頁面網址 |
| 城市／地址欄位 | 填入 `Remote` |
| 其他文字欄位 | 填入 `N/A` |
| 下拉選單 | 選擇第一個有效選項 |
| 單選按鈕 | 選擇每組第一個選項 |
| 必填文字區塊 | 填入通用說明文字 |

---

## 技能二：個人檔案爬取

依公司、國家、產業爬取 LinkedIn 個人檔案。

### 擷取欄位

| 欄位 | 說明 |
|------|------|
| `name` | 全名 |
| `headline` | 職業標題 |
| `location` | 所在地（國家／城市） |
| `currentCompany` | 目前任職公司 |
| `currentTitle` | 目前職稱 |
| `industry` | 產業類別 |
| `workHistory` | 工作經歷陣列（職稱、公司、任職期間、地點） |
| `profileUrl` | LinkedIn 個人頁面網址 |

### 設定參數

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `company` | `''` | 目標公司名稱 |
| `country` | `''` | 目標國家 |
| `industry` | `''` | 目標產業 |
| `keywords` | `''` | 其他搜尋關鍵字 |
| `maxProfiles` | 20 | 最多爬取筆數 |

### 使用範例

```javascript
// 單一個人檔案
const profile = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');

// 爬取 Google 在美國的工程師
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});

// 爬取新加坡金融業人才
const results = await scrapeLinkedInProfiles(page, {
  industry: 'Financial Services',
  country: 'Singapore',
  maxProfiles: 15
});
```

詳細使用說明請參閱 [PROFILE_SCRAPER.md](PROFILE_SCRAPER.md)。

---

## 安裝方式

### Claude Code（推薦）

```bash
claude

/plugin marketplace add yennanliu/linkedin-skill

# 安裝自動投遞職缺技能
/plugin install linkedin-job-auto-apply

# 安裝個人檔案爬取技能
/plugin install linkedin-profile-scraper

/plugin list
```

### 快速安裝腳本

```bash
git clone https://github.com/yennanliu/linkedin-skill.git
cd linkedin-skill
./install.sh
```

### 本地開發

```bash
claude
/plugin marketplace add /path/to/linkedin-skill
/plugin install linkedin-job-auto-apply@local
/plugin install linkedin-profile-scraper@local
```

---

## 前置需求

- LinkedIn 帳號（需已登入）
- Claude Code 或 Gemini CLI 中已設定 Playwright MCP 工具
- 已上傳履歷（僅自動投遞職缺技能需要）
- 穩定的網路連線

---

## 支援平台

| 平台 | 設定檔 | 安裝目錄 |
|------|--------|----------|
| Claude Code | `SKILL.md` | `~/.claude/skills/<skill-name>/` |
| Gemini CLI | `GEMINI.md` | `~/.gemini/extensions/linkedin-skill/` |
| GitHub Copilot | `.github/copilot-instructions.md` | 提交至專案 repo |

---

## 安全與法律聲明

本工具僅供**個人學習與效率提升**使用。

- 請僅申請您真正有興趣且符合資格的職缺
- 請遵守 LinkedIn 使用條款
- 系統內建擬人化延遲與速率限制
- 建議每次使用申請 20–50 份職缺
- 過度自動化操作可能導致帳號受到限制

---

## 常見問題

**找不到 Easy Apply 按鈕** — 確認已登入 LinkedIn，且搜尋結果已套用 Easy Apply 篩選器。

**申請失敗** — 檢查網路連線、帳號狀態，或先用單一職缺模式測試。

**遇到驗證碼（CAPTCHA）** — 手動完成驗證後，等待數小時再重試。

**腳本意外中斷** — 查看主控台錯誤訊息，降低 `maxPages` 值，或從上次成功的頁碼重新開始。

---

## 貢獻

請參閱 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權

MIT — 請依規定使用，並遵守 LinkedIn 使用條款。

## 致謝

靈感來自 [104Skill](https://github.com/yennanliu/104Skill) 自動化職缺申請專案。
