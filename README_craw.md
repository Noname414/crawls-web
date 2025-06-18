# 爬蟲管理器使用說明

## 概述

爬蟲管理器 (CrawlerManager) 是一個統一管理多個電商平台爬蟲的工具，可以同時執行多個爬蟲、合併結果、生成統計報告等。

## 功能特色

- 🚀 **自動載入爬蟲**: 自動掃描並載入 crawlers 目錄中的所有爬蟲
- 🔄 **並行執行**: 使用多線程同時執行多個爬蟲，提高效率
- 📊 **統計分析**: 提供詳細的爬蟲執行統計和商品價格分析
- 💾 **結果管理**: 自動保存結果為 JSON 格式，支援結果合併
- 🛠️ **錯誤處理**: 完善的異常處理機制，單個爬蟲失敗不影響其他爬蟲
- 📈 **報告生成**: 生成詳細的執行報告和平台比較分析

## 檔案結構

```markdown
爬蟲程式/
├── crawler*manager.py # 爬蟲管理器主程式
├── example_usage.py # 使用範例
├── README.md # 這個說明檔
├── crawlers/ # 爬蟲目錄
│ ├── crawler_pchome.py
│ ├── crawler_yahoo.py
│ └── crawler_routn.py
└── crawl_data/ # 輸出資料目錄
├── crawler_results*_.json
└── merged*products*_.json
```

## 快速開始

### 1. 基本使用

```python
from crawler_manager import CrawlerManager

# 建立管理器
manager = CrawlerManager()

# 查看可用爬蟲
print(manager.list_crawlers())  # ['pchome', 'yahoo', 'routn']

# 執行單個爬蟲
result = manager.run_single_crawler("pchome", "球鞋", max_products=20)
```

### 2. 執行所有爬蟲

```python
# 同時執行所有平台爬蟲
results = manager.run_all_crawlers("耳機", max_products=30)

# 保存結果
manager.save_results("耳機", results)

# 顯示統計
manager.print_statistics("耳機")
```

### 3. 指定平台執行

```python
# 只執行特定平台
platforms = ["pchome", "yahoo"]
results = manager.run_all_crawlers("手機", max_products=25, platforms=platforms)
```

## 主要功能

### CrawlerManager 類別方法

#### `__init__(crawlers_dir, output_dir)`

- **功能**: 初始化爬蟲管理器
- **參數**:
  - `crawlers_dir`: 爬蟲檔案目錄 (預設: "./crawlers")
  - `output_dir`: 輸出檔案目錄 (預設: "./crawl_data")

#### `list_crawlers()`

- **功能**: 列出所有可用的爬蟲
- **回傳**: List[str] - 爬蟲名稱列表

#### `run_single_crawler(platform, keyword, max_products)`

- **功能**: 執行單個爬蟲
- **參數**:
  - `platform`: 平台名稱 ("pchome", "yahoo", "routn")
  - `keyword`: 搜索關鍵字
  - `max_products`: 最大商品數量
- **回傳**: Dict - 爬蟲結果

#### `run_all_crawlers(keyword, max_products, platforms)`

- **功能**: 同時執行多個爬蟲
- **參數**:
  - `keyword`: 搜索關鍵字
  - `max_products`: 每個平台的最大商品數量
  - `platforms`: 指定平台列表 (可選)
- **回傳**: Dict[str, Dict] - 所有平台的結果

#### `save_results(keyword, results, filename)`

- **功能**: 保存爬蟲結果到 JSON 檔案
- **參數**:
  - `keyword`: 搜索關鍵字
  - `results`: 爬蟲結果
  - `filename`: 檔案名稱 (可選，會自動生成)
- **回傳**: str - 保存的檔案路徑

#### `merge_results(keyword, save_file)`

- **功能**: 合併所有平台的商品結果
- **參數**:
  - `keyword`: 搜索關鍵字
  - `save_file`: 是否保存合併結果 (預設: True)
- **回傳**: List[Dict] - 合併後的商品列表

#### `get_statistics(keyword)`

- **功能**: 獲取爬蟲統計資訊
- **參數**: `keyword`: 搜索關鍵字
- **回傳**: Dict - 統計資訊

#### `print_statistics(keyword)`

- **功能**: 列印格式化的統計報告
- **參數**: `keyword`: 搜索關鍵字

## 輸出格式

### 爬蟲結果格式

```json
{
  "keyword": "球鞋",
  "crawl_time": "2025-01-17T10:30:00",
  "summary": {
    "total_platforms": 3,
    "total_products": 150,
    "successful_crawlers": 3,
    "failed_crawlers": 0
  },
  "results": {
    "pchome": {
      "platform": "pchome",
      "keyword": "球鞋",
      "total_products": 50,
      "products": [...],
      "status": "success"
    }
  }
}
```

### 統計報告格式

```
=== 爬蟲統計報告 - 球鞋 ===
執行平台數: 3
成功爬蟲: 3
失敗爬蟲: 0
總商品數: 150
平均價格: NT$ 2,500.00
價格範圍: NT$ 800 - NT$ 8,000

各平台詳細資訊:
✅ PCHOME: 50 個商品, 耗時 3.45s
✅ YAHOO: 60 個商品, 耗時 4.12s
✅ ROUTN: 40 個商品, 耗時 2.98s
```

## 使用範例

### 範例 1: 基本商品搜索

```python
manager = CrawlerManager()
results = manager.run_all_crawlers("iPhone", max_products=20)
manager.save_results("iPhone", results)
manager.print_statistics("iPhone")
```

### 範例 2: 價格比較分析

```python
manager = CrawlerManager()
results = manager.run_all_crawlers("筆記型電腦", max_products=50)

# 合併結果並按價格排序
merged_products = manager.merge_results("筆記型電腦")
cheapest = min(merged_products, key=lambda x: x.get("price", 0))
most_expensive = max(merged_products, key=lambda x: x.get("price", 0))

print(f"最便宜: {cheapest['title']} - NT$ {cheapest['price']}")
print(f"最昂貴: {most_expensive['title']} - NT$ {most_expensive['price']}")
```

### 範例 3: 互動式使用

```python
# 執行 example_usage.py 中的互動模式
python example_usage.py
```

## 錯誤處理

管理器具有完善的錯誤處理機制：

1. **爬蟲載入失敗**: 會跳過有問題的爬蟲檔案，繼續載入其他爬蟲
2. **單個爬蟲執行失敗**: 不會影響其他爬蟲的執行
3. **網路錯誤**: 自動重試機制（由各個爬蟲實現）
4. **資料格式錯誤**: 記錄錯誤資訊並返回空結果

## 擴展爬蟲

要添加新的爬蟲平台：

1. 在 `crawlers/` 目錄中建立新檔案，命名格式為 `crawler_平台名.py`
2. 實現 `run(keyword, max_products)` 函數
3. 確保回傳格式與現有爬蟲一致：

```python
def run(keyword: str, max_products: int = 100) -> List[Dict]:
    # 爬蟲邏輯
    return [
        {
            "title": "商品名稱",
            "price": 1000,
            "image_url": "圖片網址",
            "url": "商品網址",
            "platform": "平台名稱"
        }
    ]
```

4. 重新啟動管理器即可自動載入新爬蟲

## 注意事項

1. **執行速度**: 使用多線程並行執行可能會增加目標網站的負載，請適當控制並發數量
2. **反爬機制**: 各平台可能有反爬蟲機制，建議設置適當的延遲時間
3. **資料準確性**: 爬蟲結果僅供參考，實際價格和資訊以官方網站為準
4. **法律合規**: 請遵守相關法律法規和網站使用條款

## 疑難排解

### 常見問題

**Q: 爬蟲無法載入**
A: 檢查 crawlers 目錄是否存在，檔案名稱是否符合 `crawler_*.py` 格式

**Q: 某個平台爬蟲失敗**
A: 查看錯誤訊息，可能是網路問題或網站結構變更，需要更新對應的爬蟲程式

**Q: 結果保存失敗**
A: 檢查 crawl_data 目錄是否有寫入權限

**Q: 統計資訊不正確**
A: 確保所有爬蟲都正常執行完成，檢查爬蟲回傳的資料格式

## 更新日誌

- **v1.0.0**: 初始版本，支援 PChome、Yahoo、露天三個平台
- 自動爬蟲載入功能
- 並行執行和統計分析功能
- 結果保存和合併功能
