# 老派健身食堂 (NASM SFS Kitchen)

這是一個基於 **NASM OPT 模型** (美國國家運動醫學會) 與**高齡者體適能訓練 (Senior Fitness Specialist, SFS)** 指南所設計的互動式健身菜單產生工具。

本作以「食堂點菜」為概念，旨在提供「教練主廚」與「老饕食客」一個直覺、美觀且具備專業防呆機制的平台。系統能依據使用者的 **OHSA (動態姿勢評估)** 檢測結果、**慢性病禁忌**以及所選的 **OPT 訓練階段**，自動過濾食材(動作庫)，並產生專屬且安全的客製化運動菜單。

---

## ✨ 核心特色功能

- **👤 權限分級與身分驗證**
  - 整合 Google OAuth，充滿食堂氛圍的區分了「教練主廚 (管理員)」與「老饕食客 (一般使用者)」。
  - 「教練主廚」能直接在系統內新增動作(食材)、發布與刪除歷史點菜單據。
- **🧠 智能過濾與推薦系統**
  - **OHSA 矯正聯動：** 根據使用者勾選的「膝蓋內夾」、「腳尖外轉」等現象，自動推薦需「放鬆」的過度活躍肌肉，及需「強化」的活動不足肌肉。
  - **慢性病禁忌防護：** 篩選出具有高血壓、骨質疏鬆等禁忌的動作，並顯示警告標示阻止受傷風險。
  - **OPT 階段自動轉換：** 切換 Phase 1 ~ Phase 5，動作庫自動過濾僅顯示該階段適合之動作，並針對超級組自動切換模板格式。
- **📋 互動式「點菜」介面**
  - **拖拉設計 (Drag & Drop)：** 電腦版支援直覺的拖曳加入區塊，手機版支援「＋」一鍵快速加入菜單。
  - **防呆與檢查：** 阻擋重複動作、拒絕跨區加入(例如不可把阻力訓練放入暖身區)、並限制 Phase 2/5 必須符合固定組間模式。
- **☁️ 輕量化的純前端+試算表架構**
  - 無需部署伺服器，**Google Sheets** 即為後端資料庫。
  - 自動存取紀錄、生成純文字菜單一鍵複製分享。

---

## 🛠 技術堆疊

- **前端：** Vanilla HTML5, CSS3, JavaScript (ES6+), FontAwesome Icons
- **後端/資料庫：** Google Sheets API v4
- **登入授權：** Google Identity Services (OAuth 2.0)

---

## 🚀 本機運行與部署方式

因為本專案為純前端網頁應用，部署相當快速：

### 1. 準備 Google Cloud Platform (GCP)
1. 建立一個新的 GCP 專案。
2. 啟用 **Google Sheets API**。
3. 建立 **OAuth 用戶端 ID (Web Application)**。
   - 將您的網域或 `http://localhost` 加入授權的 JavaScript 來源。
   - 將產生的 `CLIENT_ID` 複製下來。

### 2. 準備 Google 試算表 (資料庫)
必須擁有一份包含以下 Sheet 分頁格式的 Google 試算表：
- `OHSA_Logic`、`OPT_Variables`、`Medical_Precautions`、`Exercise_Library`、`Admins`、`Menu_History`
- 將該檔案 ID 複製下來。

### 3. 配置專案
打開專案內的 `config.js`，將上面的 ID 填入：
```javascript
const CONFIG = {
    CLIENT_ID: '您的_GOOGLE_OAUTH_CLIENT_ID',
    SPREADSHEET_ID: '您的_GOOGLE_SHEET_ID',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
};
```

### 4. 啟動伺服器
可以直接在終端機內透過 Python 或 Node 開啟一個本機伺服器：
```bash
# Python 3
python -m http.server 8000

# 或使用 Node 的 http-server 等套件
npx http-server -p 8000
```
在瀏覽器打開 `http://localhost:8000` 即可開始點菜！

---

## 📝 授權與注意事項

- **隱私權相關：** 因使用 `spreadsheets` 權限範圍，Google 授權畫面會提示擁有所有試算表存取權為正常現象。若使用者需寫入歷史資料，該使用者的 Google 帳號必須在雲端硬碟中擁有一份該試算表檔案的「編輯者」權限。

---
*Developed for Vibe Fitness Project.*
