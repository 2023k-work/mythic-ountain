# Codex 交代日誌

## 目前狀態

- 專案：`mythic-ountain｜變奏仙山`
- Repository：<https://github.com/2023k-work/mythic-ountain>
- 分支：`main`
- 本日誌建立時的最新功能 commit：`5d7feb0`（起飛即擴散）
- GitHub Pages AR：<https://2023k-work.github.io/mythic-ountain/ar.html>
- GitHub Pages 根目錄主頁：目前不發布，公開網址回傳 404。
- 工作區在建立本日誌前為乾淨狀態。

## 已完成的功能

- M1～M5 五張掃描圖片已編譯成單一 MindAR 多目標資料：`M1-M5.mind`。
- 每個 target 都有自己的 anchor、蝴蝶群、淡入／淡出與追蹤穩定器。
- 蝴蝶位置取自原 Unity 的 M1～M5 prefab，並依各 target 實體寬度正規化。
- 蝴蝶大小依 target 寬度比例縮放，再對每隻蝴蝶加入亂數大小。
- 點擊 AR 畫面後，蝴蝶起飛即進入圓錐擴散；每隻蝴蝶有獨立轉向與路徑，沒有終點位置。
- 起飛時保留各自當下的揮翅速度。
- AR 頁面全螢幕、相機自動啟動，右上角使用小型 GitHub icon 連到 repository。
- GitHub Pages 不再輸出根目錄 Playground 主頁；本機的 `index.html` 仍保留作開發使用。

## 主要架構與檔案責任

- `src/ar-main.ts`：AR 啟動、M1～M5 anchor 事件、各 target runtime、追蹤狀態與點擊觸發。
- `src/mindar-image-adapter.ts`：MindAR runtime 封裝，建立五個 target anchor。
- `src/target-manifest.ts`：M1～M5 target index、實體尺寸、蝴蝶數量與共用 `.mind` 路徑。
- `src/m1-group-manifest.ts`：從 Unity prefab 整理出的 M1～M5 蝴蝶位置。
- `src/wing-actor.ts`：翅膀材質、揮翅、淡入淡出與飛行路徑；目前飛行使用平滑轉向模型。
- `src/pose-stabilizer.ts`：anchor 姿態的位置、旋轉與尺度平滑。
- `src/compile-target.ts`：將 `targets/M1.jpg`～`M5.jpg` 編譯成多目標資料。
- `scripts/compile-target.mjs`：以 Playwright 啟動本機 HTTPS compiler，輸出 `public/targets/M1-M5.mind`。
- `public/`：Vite runtime 原始資產；`docs/`：GitHub Pages 靜態發布資產。
- `vite.config.ts`：GitHub Pages build 只輸出 AR 與 target compiler，不輸出根目錄 Playground。

## 驗證證據

### PASS

- `npm run compile:target`：成功產生 `public/targets/M1-M5.mind`。
- `VITE_BASE_PATH='/mythic-ountain/' npm run build`：TypeScript 與 Vite production build 成功。
- 本機 HTTPS AR 頁面與 `M1-M5.mind` 均可存取。
- GitHub Pages AR 頁面已確認載入 immediate-spread 版本 bundle。
- GitHub Pages 上 M1～M5 圖片與 `M1-M5.mind` 均回傳 HTTP 200。
- `git diff --check`：無格式錯誤。

### FAIL

- 無已知失敗的自動化檢查。

### BLOCKED

- 無。

### NOT RUN

- Repository 沒有針對 AR 飛行路徑的自動化單元測試或端對端測試。

### MANUAL REQUIRED

- 仍需用實體手機掃描 M1～M5，確認不同 target 的蝴蝶位置、起飛即擴散與轉彎手感。
- 仍需在實體手機上確認 Safari／Chrome 的相機權限與全螢幕行為。

## 後續工作入口

1. 若只調整飛行手感，主要修改 `src/wing-actor.ts`，建置後同步 `docs/`。
2. 若修改 M1～M5 掃描圖片，先啟動 `npm run dev`，再執行 `npm run compile:target`，確認新的 `M1-M5.mind` 已產生後再 build。
3. GitHub Pages build 使用：

   ```powershell
   $env:VITE_BASE_PATH = '/mythic-ountain/'
   npm run build
   Remove-Item Env:VITE_BASE_PATH
   Get-ChildItem -LiteralPath 'dist' -Force | Copy-Item -Destination 'docs' -Recurse -Force
   ```

4. 發布前確認 `docs/index.html` 不存在，避免根目錄主頁重新公開。
5. 修改完成後執行 `npm run build`、檢查 `git status`，再提交並推送 `main`。

## 重要決策與限制

- 目前選擇單一多目標 `.mind`，不是為每張圖片各自啟動一個 MindAR runtime。
- `maxTrack` 維持 1，因此預期一次追蹤一張 target；若要同時顯示多張圖片，需要重新設計互動狀態與效能上限。
- 飛行路徑參考原 Unity `Assets/Scripts/Butterfly.cs` 的平滑轉向概念，但網頁版仍是 2D 翅膀 actor，不是 Unity 3D 模型的逐值移植。
- GitHub Pages 的 AR 頁面仍是公開的；「不公開主頁面」只代表根目錄不發布，不代表 repository 或 AR URL 私有化。
