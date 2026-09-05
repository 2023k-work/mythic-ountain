# mythic-ountain｜變奏仙山

以山脈圖片作為辨識目標的網頁 AR 作品。偵測成功後，畫面會出現只由翅膀構成的蝴蝶群，
並以 57 種翅膀變奏、不同大小與獨立揮翅節奏呈現群飛效果。

## AR 頁面

- AR 頁面網址：<https://2023k-work.github.io/mythic-ountain/ar.html>
- 專案首頁：<https://2023k-work.github.io/mythic-ountain/>

<p align="center">
  <img src="public/ar-qr-code.png" alt="AR 頁面 QR 圖碼" width="280" />
</p>

## Asset 掃描圖片

已從原始 Asset 提取 M1 至 M5 共 5 張掃描圖片，目前 AR 辨識程式已將 5 張圖片編譯為同一組
多目標辨識資料；掃描 M1 至 M5 任一圖片都會產生對應的蝴蝶群。

<table>
  <tr>
    <td align="center"><strong>M1</strong><br /><img src="public/targets/M1.jpg" alt="M1 山脈 AR 掃描圖片" width="300" /></td>
    <td align="center"><strong>M2</strong><br /><img src="public/targets/M2.jpg" alt="M2 山脈 AR 掃描圖片" width="300" /></td>
  </tr>
  <tr>
    <td align="center"><strong>M3</strong><br /><img src="public/targets/M3.jpg" alt="M3 山脈 AR 掃描圖片" width="300" /></td>
    <td align="center"><strong>M4</strong><br /><img src="public/targets/M4.jpg" alt="M4 山脈 AR 掃描圖片" width="300" /></td>
  </tr>
  <tr>
    <td align="center"><strong>M5</strong><br /><img src="public/targets/M5.jpg" alt="M5 山脈 AR 掃描圖片" width="300" /></td>
    <td></td>
  </tr>
</table>

## 使用說明

### 使用手機體驗

1. 使用手機的 Safari 或 Chrome 開啟上方 AR 頁面網址。
2. 允許瀏覽器使用相機；頁面進入後會自動啟動相機。
3. 將手機對準上方任一張 M1～M5 山脈圖片，等待對應的蝴蝶群逐漸浮現。
4. 偵測成功後，點擊一次相機畫面，全部蝴蝶會朝手機後方以圓錐狀方向擴散飛離。
5. 蝴蝶飛離後不會自動回來；重新掃描目前的圖片才會重置。

### 本機執行

```powershell
npm install
npm run dev
```

手機測試時，請使用終端機顯示的 HTTPS 區域網路網址，例如：
`https://192.168.1.197:5173/ar.html`。第一次開啟可能會遇到自簽憑證警告，請允許繼續存取；
HTTP 網址無法使用手機相機。

### 更新 GitHub Pages

修改程式後，請以 GitHub Pages 的專案路徑重新建置，再將建置結果同步到 `docs/`：

```powershell
$env:VITE_BASE_PATH = '/mythic-ountain/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

將 `dist/` 內容複製到 `docs/` 後提交並推送至 `main`，GitHub Pages 就會更新網站。
