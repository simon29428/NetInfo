# Firewall Topology Visualizer (使用 Cytoscape.js)

Firewall Topology Visualizer 是一個純前端的 Web 工具，旨在幫助網路管理員和安全分析師可視化防火牆規則、模擬流量行為、分析潛在的規則問題，並輕鬆搜尋和瀏覽網路拓樸元素。所有資料都通過 JSON 格式載入和儲存，方便管理和共享。本版本使用 Cytoscape.js 作為核心圖形視覺化引擎。

## 功能特性

*   **圖形化顯示**: 以節點和邊的形式清晰展示防火牆規則、網路物件（主機、網路）、安全區域 (Zone) 及物件群組 (Group) 及其相互關係。Zone 和 Group 利用 Cytoscape.js 的複合節點特性進行渲染，提供清晰的層次結構。
*   **TAG 標記**: 網路物件和防火牆規則都可以標記一個或多個自訂 TAG，方便分類和識別。TAG 可以設定顏色以在圖形上突出顯示。
*   **Zone 歸類**: 網路物件可以分配到不同的安全區域 (Zone)，Zone 在圖形上作為父容器以不同顏色區分。
*   **群組定義**: 支援將多個網路物件定義為一個群組，群組在圖形上亦可作為父容器展示，規則可以引用這些群組作為來源或目標，簡化規則配置。
*   **流量模擬**: 使用者可以輸入模擬流量的參數（來源 IP、目標 IP、目標端口、協定），工具會在圖上高亮顯示匹配該流量的規則及相關的物件和路徑。
*   **規則分析 (初步)**: 提供初步的規則分析功能，嘗試識別規則集中潛在的衝突、冗餘或被陰影的規則（基於規則在 JSON 中定義的順序，越靠前的規則優先級越高）。分析結果會高亮有問題的規則並在工具提示中提供說明。
*   **強大的搜尋功能**: 允許使用者按 IP 位址、端口號、TAG 名稱、物件/群組/Zone 名稱、規則描述等關鍵字快速搜尋和定位圖中的元素。匹配的元素會被高亮，不匹配的元素會被調暗。
*   **JSON 匯入/匯出**:
    *   **匯出**: 可以將當前載入的防火牆拓樸資料匯出為 JSON 檔案（例如 `firewall_config_cy.json`），方便備份和共享。
    *   **匯入**: 支援從本地選擇符合格式的 JSON 檔案載入新的拓樸資料並重新渲染圖形。
*   **互動式圖形**:
    *   支援拖曳節點（包括父節點）以自由調整佈局。
    *   支援通過滑鼠滾輪或 Cytoscape.js 提供的導覽按鈕縮放視圖。
    *   支援拖曳畫布背景進行平移。
    *   點擊圖中的節點（物件、Zone、Group）或邊（規則）時，會在頁面右側彈出的「Selection Details」面板中顯示該元素的詳細屬性資訊和原始 JSON 資料。
## 如何使用

1.  **開啟工具**: 直接在任何現代網頁瀏覽器（如 Chrome, Firefox, Edge）中打開 `index.html` 檔案即可開始使用。
2.  **資料載入**:
    *   **預設資料**: 工具啟動時會嘗試自動載入與 `index.html` 位於同一目錄下的 `data.json` 檔案作為初始資料。
    *   **匯入資料**: 您可以通過點擊左側 "Data Management" 面板中的 "Import JSON" 按鈕，選擇您本地的 JSON 檔案來載入自訂的防火牆拓樸設定。
3.  **功能面板操作**:
    *   **Simulate Traffic Panel**:
        *   填寫 `Source IP`, `Destination IP`, `Dest Port`, 和 `Protocol`。
        *   點擊 "Simulate" 按鈕，圖中匹配的規則和相關物件將被高亮。
        *   點擊 "Clear Sim" 按鈕清除模擬高亮效果。
    *   **Search Graph Panel**:
        *   在 `Search Term` 輸入框中輸入您想搜尋的關鍵字（如 IP、端口、物件名、TAG 名稱等）。
        *   點擊 "Search" 按鈕 (或按 Enter 鍵)，圖中匹配的元素將被高亮，其他元素將被調暗。
        *   點擊 "Clear Search" 按鈕清除搜尋結果和高亮。
    *   **Data Management Panel**:
        *   `Export JSON`: 點擊此按鈕會將當前圖形所基於的 JSON 資料下載到您的電腦（檔案名通常為 `firewall_config_cy.json`）。
        *   `Import JSON`: 點擊此按鈕會彈出檔案選擇框，您可以選擇一個本地的 JSON 檔案來更新圖形顯示。
        *   `Analyze Rules`: 點擊此按鈕會對當前載入的規則集進行分析，嘗試找出潛在的配置問題。有問題的規則邊緣會被特殊顏色高亮，並在其工具提示中顯示問題描述。分析結果也會輸出到瀏覽器的開發者控制台。
4.  **圖形互動**:
    *   **拖曳**: 按住滑鼠左鍵拖曳節點可以改變其位置。拖曳畫布空白處可以平移整個視圖。
    *   **縮放**: 使用滑鼠滾輪向上或向下滾動可以縮放視圖。Cytoscape.js 通常會在圖的左下角提供一組導覽控制按鈕（包括縮放）。
    *   **查看詳情**: 單擊圖中的任意節點（代表網路物件、Zone 或 Group）或邊（代表防火牆規則），頁面右側將彈出一個「Selection Details」面板，顯示該元素的詳細屬性資訊及其原始 JSON 資料結構。點擊面板上的 "Close" 按鈕或圖形空白區域可以關閉此面板。

## JSON 資料格式說明

本工具使用特定的 JSON 結構來定義防火牆拓樸。一個有效的 JSON 檔案應包含以下頂層鍵，每個鍵對應一個陣列：

*   `objects`: 網路物件定義 (陣列)
*   `tags`: 標籤定義 (陣列)
*   `groups`: 物件群組定義 (陣列)
*   `zones`: 安全區域定義 (陣列)
*   `rules`: 防火牆規則定義 (陣列)

以下是各主要部分的欄位簡要說明：

**1. `objects` (網路物件)**
   每個物件包含：
   *   `id` (string, 必填): 物件的唯一標識符。
   *   `name` (string, 必填): 物件的人類可讀名稱。
   *   `type` (string, 必填): 物件類型，如 `host` (單一 IP), `network` (CIDR), `any` (0.0.0.0/0)。
   *   `value` (string, 必填): 物件的值 (例如 IP 位址 "192.168.1.10", CIDR "10.0.0.0/8")。
   *   `tags` (array of strings, 可選): 引用 `tags` 中定義的 TAG ID 列表。
   *   `zone` (string, 可選): 引用 `zones` 中定義的 Zone ID。

**2. `tags` (標籤)**
   每個 TAG 包含：
   *   `id` (string, 必填): TAG 的唯一標識符。
   *   `name` (string, 必填): TAG 的顯示名稱。
   *   `description` (string, 可選): TAG 的描述。
   *   `color` (string, 可選): TAG 的十六進制顏色代碼 (如 "#3498db")，用於視覺化。

**3. `groups` (物件群組)**
   每個群組包含：
   *   `id` (string, 必填): 群組的唯一標識符。
   *   `name` (string, 必填): 群組的顯示名稱。
   *   `members` (array of strings, 必填): 包含的 `objects` ID 列表。
   *   `tags` (array of strings, 可選): 群組自身的 TAG ID 列表。

**4. `zones` (安全區域)**
   每個 Zone 包含：
   *   `id` (string, 必填): Zone 的唯一標識符。
   *   `name` (string, 必填): Zone 的顯示名稱。
   *   `description` (string, 可選): Zone 的描述。
   *   `color` (string, 可選): Zone 的十六進制顏色代碼，用於節點背景色。

**5. `rules` (防火牆規則)**
   每個規則包含：
   *   `id` (string, 必填): 規則的唯一標識符。
   *   `name` (string, 可選): 規則的人類可讀名稱。
   *   `source_zone` (array of strings, 必填): 來源 Zone ID 列表。
   *   `destination_zone` (array of strings, 必填): 目標 Zone ID 列表。
   *   `source_objects` (array of strings, 必填): 來源物件 ID 或群組 ID 列表。
   *   `destination_objects` (array of strings, 必填): 目標物件 ID 或群組 ID 列表。
   *   `services` (array of objects, 必填): 服務列表，每個服務物件包含：
        *   `protocol` (string, 必填): 如 "TCP", "UDP", "ICMP", "ANY"。
        *   `destination_port` (string, 必填): 目標端口號，可以是單一端口 ("80"), 或 "ANY"。 (目前版本主要處理單一端口和 "ANY")。
   *   `action` (string, 必填): 規則動作，"allow" 或 "deny"。
   *   `enabled` (boolean, 必填): 規則是否啟用 (`true` 或 `false`)。
   *   `tags` (array of strings, 可選): 規則的 TAG ID 列表。
   *   `description` (string, 可選): 規則的詳細描述。

**重要**: 所有 `id` 欄位在其各自的類別中應保持唯一。規則中的 `source_objects`, `destination_objects`, `tags`, `zone` 等欄位通過這些 `id` 引用其他定義的元素。

## 範例資料 (`data.json`)

專案中包含的 `data.json` 檔案是一個完整的範例，展示了如何組織上述資料結構。您可以參考此檔案來創建自己的防火牆拓樸設定。它包含了各種物件、TAG、群組、Zone 和規則的定義，可以很好地演示工具的各項功能。

## 技術棧

*   **前端**: HTML5, CSS3, JavaScript (ES6+)
*   **圖形視覺化**: [Cytoscape.js](https://js.cytoscape.org/)

## 未來可能的改進

*   更精確和全面的規則分析演算法（例如，考慮複雜的 CIDR 重疊、端口範圍）。
*   支援更多網路物件類型（如 FQDN、IP 範圍物件）。
*   利用 Cytoscape.js 更強大的複合節點和擴展能力（如 `cytoscape-fcose` 進行更優的複合佈局，或 `cytoscape-expand-collapse` 擴展）來增強群組的互動性（例如，手動展開/收起群組）。
*   更完善的使用者介面和使用者體驗，例如可拖動和可調整大小的控制面板、主題選擇等。
*   支援儲存圖形佈局狀態（例如，節點的手動拖曳位置）。
*   整合版本控制或協作功能 (可能需要後端支援)。

---

希望這份說明文件能夠幫助您更好地理解和使用 Firewall Topology Visualizer！
