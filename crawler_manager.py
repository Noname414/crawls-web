import os
import json
import time
import uuid
import threading
from typing import List, Dict, Optional, Callable
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import importlib.util
import sys

class CrawlerManager:
    """爬蟲管理器 - 統一管理所有爬蟲的執行"""
    
    def __init__(self, crawlers_dir: str = "./crawlers", output_dir: str = "./crawl_data"):
        """
        初始化爬蟲管理器
        
        Args:
            crawlers_dir (str): 爬蟲檔案目錄
            output_dir (str): 輸出檔案目錄
        """
        self.crawlers_dir = crawlers_dir
        self.output_dir = output_dir
        self.crawlers = {}
        self.results = {}
        self.task_queue = []
        self.running_tasks = {}
        
        # 確保輸出目錄存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 自動載入爬蟲
        self._load_crawlers()
    
    def _load_crawlers(self):
        """自動載入crawlers目錄中的所有爬蟲模組"""
        if not os.path.exists(self.crawlers_dir):
            print(f"警告: 爬蟲目錄 {self.crawlers_dir} 不存在")
            return
        
        for filename in os.listdir(self.crawlers_dir):
            if filename.startswith("crawler_") and filename.endswith(".py"):
                platform = filename.replace("crawler_", "").replace(".py", "")
                module_path = os.path.join(self.crawlers_dir, filename)
                
                try:
                    # 動態載入模組
                    spec = importlib.util.spec_from_file_location(f"crawler_{platform}", module_path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # 檢查模組是否有run函數
                    if hasattr(module, 'run'):
                        self.crawlers[platform] = module.run
                        print(f"成功載入爬蟲: {platform}")
                    else:
                        print(f"警告: {filename} 沒有run函數")
                        
                except Exception as e:
                    print(f"載入爬蟲 {filename} 失敗: {e}")
    
    def list_crawlers(self) -> List[str]:
        """列出所有可用的爬蟲"""
        return list(self.crawlers.keys())

    def add_task(self, platform: str, keyword: str, max_products: int = 100, min_price: int = 0, max_price: int = 999999) -> str:
        """
        添加爬蟲任務到隊列
        
        Args:
            platform (str): 平台名稱 (pchome, yahoo, routn)
            keyword (str): 搜索關鍵字
            max_products (int): 最大商品數量
            min_price (int): 最低價格範圍
            max_price (int): 最高價格範圍
        Returns:
            str: 任務ID
        """
        if platform not in self.crawlers:
            raise ValueError(f"不支援的平台: {platform}")
        
        task_id = str(uuid.uuid4())
        task = {
            "id": task_id,
            "platform": platform,
            "keyword": keyword,
            "max_products": max_products,
            "min_price": min_price,
            "max_price": max_price,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
            "error": None
        }
        
        self.task_queue.append(task)
        print(f"已添加任務: {platform} - {keyword} (任務ID: {task_id})")
        return task_id

    def run_single_crawler(self, platform: str, keyword: str, max_products: int = 100, min_price: int = 0, max_price: int = 999999) -> Dict:
        """
        執行單個爬蟲
        
        Args:
            platform (str): 平台名稱
            keyword (str): 搜索關鍵字
            max_products (int): 最大商品數量
            min_price (int): 最低價格範圍
            max_price (int): 最高價格範圍
        Returns:
            Dict: 爬蟲結果
        """
        if platform not in self.crawlers:
            raise ValueError(f"不支援的平台: {platform}")
        
        print(f"開始執行 {platform} 爬蟲，關鍵字: {keyword}")
        start_time = time.time()
        
        try:
            # 呼叫對應平台的爬蟲函數
            products = self.crawlers[platform](keyword, max_products, min_price, max_price)

            result = {
                "platform": platform,
                "keyword": keyword,
                "total_products": len(products),
                "products": products,
                "crawl_time": datetime.now().isoformat(),
                "execution_time": time.time() - start_time,
                "status": "success"
            }
            
            print(f"{platform} 爬蟲完成，獲取 {len(products)} 個商品")
            return result
            
        except Exception as e:
            print(f"{platform} 爬蟲執行失敗: {e}")
            return {
                "platform": platform,
                "keyword": keyword,
                "total_products": 0,
                "products": [],
                "crawl_time": datetime.now().isoformat(),
                "execution_time": time.time() - start_time,
                "status": "error",
                "error": str(e)
            }

    def run_all_crawlers(self, keyword: str, max_products: int = 100, min_price: int = 0, max_price: int = 999999,
                        platforms: Optional[List[str]] = None) -> Dict[str, Dict]:
        """
        同時執行所有爬蟲
        
        Args:
            keyword (str): 搜索關鍵字
            max_products (int): 每個平台的最大商品數量
            platforms (List[str], optional): 指定要執行的平台，None表示全部
            min_price (int): 最低價格範圍
            max_price (int): 最高價格範圍
            
        Returns:
            Dict[str, Dict]: 所有平台的爬蟲結果
        """
        if platforms is None:
            platforms = list(self.crawlers.keys())
        
        print(f"開始同時執行 {len(platforms)} 個爬蟲，關鍵字: {keyword}")
        start_time = time.time()
        
        results = {}
        
        # 使用線程池同時執行多個爬蟲
        with ThreadPoolExecutor(max_workers=len(platforms)) as executor:
            # 提交所有任務
            future_to_platform = {
                executor.submit(self.run_single_crawler, platform, keyword, max_products, min_price, max_price): platform
                for platform in platforms
            }
            
            # 收集結果
            for future in as_completed(future_to_platform):
                platform = future_to_platform[future]
                try:
                    result = future.result()
                    results[platform] = result
                except Exception as e:
                    print(f"{platform} 爬蟲執行異常: {e}")
                    results[platform] = {
                        "platform": platform,
                        "keyword": keyword,
                        "total_products": 0,
                        "products": [],
                        "crawl_time": datetime.now().isoformat(),
                        "status": "error",
                        "error": str(e)
                    }
        
        total_time = time.time() - start_time
        total_products = sum(result.get("total_products", 0) for result in results.values())
        
        print(f"所有爬蟲執行完成，總共獲取 {total_products} 個商品，耗時 {total_time:.2f} 秒")
        
        # 儲存結果到實例變數
        self.results[keyword] = results
        
        return results
    
    def save_results(self, keyword: str, results: Dict[str, Dict], 
                    filename: Optional[str] = None) -> str:
        """
        保存爬蟲結果到JSON檔案
        
        Args:
            keyword (str): 搜索關鍵字
            results (Dict): 爬蟲結果
            filename (str, optional): 檔案名，None表示自動生成
            
        Returns:
            str: 保存的檔案路徑
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"crawler_results_{keyword}_{timestamp}.json"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # 整理輸出格式
        output_data = {
            "keyword": keyword,
            "crawl_time": datetime.now().isoformat(),
            "total_products": sum(result.get("total_products", 0) for result in results.values()),
            "summary": {
                "total_platforms": len(results),
                # "total_products": sum(result.get("total_products", 0) for result in results.values()),
                "successful_crawlers": len([r for r in results.values() if r.get("status") == "success"]),
                "failed_crawlers": len([r for r in results.values() if r.get("status") == "error"])
            },
            "results": results
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"結果已保存至: {filepath}")
        return filepath
    
    def merge_results(self, keyword: str, save_file: bool = True) -> List[Dict]:
        """
        合併所有平台的商品結果
        
        Args:
            keyword (str): 搜索關鍵字
            save_file (bool): 是否保存合併結果
            
        Returns:
            List[Dict]: 合併後的商品列表
        """
        if keyword not in self.results:
            print(f"找不到關鍵字 '{keyword}' 的結果")
            return []
        
        merged_products = []
        results = self.results[keyword]
        
        for platform, result in results.items():
            if result.get("status") == "success":
                merged_products.extend(result.get("products", []))
        
        # 按價格排序
        merged_products.sort(key=lambda x: x.get("price", 0))
        
        if save_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"merged_products_{keyword}_{timestamp}.json"
            filepath = os.path.join(self.output_dir, filename)
            
            output_data = {
                "keyword": keyword,
                "total_products": len(merged_products),
                "products": merged_products,
                "merge_time": datetime.now().isoformat()
            }
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            print(f"合併結果已保存至: {filepath}")
        
        return merged_products
    
    def get_statistics(self, keyword: str) -> Dict:
        """
        獲取爬蟲統計資訊
        
        Args:
            keyword (str): 搜索關鍵字
            
        Returns:
            Dict: 統計資訊
        """
        if keyword not in self.results:
            return {}
        
        results = self.results[keyword]
        stats = {
            "keyword": keyword,
            "platforms": {},
            "summary": {
                "total_platforms": len(results),
                "total_products": 0,
                "successful_crawlers": 0,
                "failed_crawlers": 0,
                "average_price": 0,
                "price_range": {"min": 0, "max": 0}
            }
        }
        
        all_prices = []
        
        for platform, result in results.items():
            platform_stats = {
                "status": result.get("status", "unknown"),
                "product_count": result.get("total_products", 0),
                "execution_time": result.get("execution_time", 0),
                "error": result.get("error")
            }
            
            if result.get("status") == "success":
                stats["summary"]["successful_crawlers"] += 1
                stats["summary"]["total_products"] += result.get("total_products", 0)
                
                # 收集價格資訊
                for product in result.get("products", []):
                    price = product.get("price", 0)
                    if price > 0:
                        all_prices.append(price)
            else:
                stats["summary"]["failed_crawlers"] += 1
            
            stats["platforms"][platform] = platform_stats
        
        # 計算價格統計
        if all_prices:
            stats["summary"]["average_price"] = sum(all_prices) / len(all_prices)
            stats["summary"]["price_range"]["min"] = min(all_prices)
            stats["summary"]["price_range"]["max"] = max(all_prices)
        
        return stats
    
    def print_statistics(self, keyword: str):
        """列印統計資訊"""
        stats = self.get_statistics(keyword)
        if not stats:
            print(f"找不到關鍵字 '{keyword}' 的統計資訊")
            return
        
        print(f"\n=== 爬蟲統計報告 - {keyword} ===")
        print(f"執行平台數: {stats['summary']['total_platforms']}")
        print(f"成功爬蟲: {stats['summary']['successful_crawlers']}")
        print(f"失敗爬蟲: {stats['summary']['failed_crawlers']}")
        print(f"總商品數: {stats['summary']['total_products']}")
        print(f"平均價格: NT$ {stats['summary']['average_price']:.2f}")
        print(f"價格範圍: NT$ {stats['summary']['price_range']['min']} - NT$ {stats['summary']['price_range']['max']}")
        
        print("\n各平台詳細資訊:")
        for platform, platform_stats in stats["platforms"].items():
            status_icon = "✅" if platform_stats["status"] == "success" else "❌"
            print(f"{status_icon} {platform.upper()}: {platform_stats['product_count']} 個商品, "
                  f"耗時 {platform_stats['execution_time']:.2f}s")
            if platform_stats["error"]:
                print(f"    錯誤: {platform_stats['error']}")


def main():
    """主程式範例"""
    # 初始化爬蟲管理器
    manager = CrawlerManager()
    
    print("可用的爬蟲:", manager.list_crawlers())
    
    # 設定搜索關鍵字
    keyword = "iphone"
    max_products = 100
    min_price = 1000
    max_price = 30000
    
    # 執行所有爬蟲
    results = manager.run_all_crawlers(keyword, max_products, min_price, max_price)

    # 保存結果
    manager.save_results(keyword, results)
    
    # 顯示統計資訊
    manager.print_statistics(keyword)
    
    # 合併所有平台結果
    merged_products = manager.merge_results(keyword)
    print(f"\n合併後總共有 {len(merged_products)} 個商品")


if __name__ == "__main__":
    main()
