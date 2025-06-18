#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬蟲管理器使用範例
這個檔案展示如何使用CrawlerManager來管理多個爬蟲
"""

from crawler_manager import CrawlerManager

def example_basic_usage():
    """基本使用範例"""
    print("=== 基本使用範例 ===")
    
    # 建立爬蟲管理器
    manager = CrawlerManager()
    
    # 查看可用的爬蟲
    print(f"可用的爬蟲: {manager.list_crawlers()}")
    
    # 執行單個爬蟲
    result = manager.run_single_crawler("pchome", "球鞋", max_products=10)
    print(f"PChome爬蟲結果: 獲取到 {result['total_products']} 個商品")

def example_run_all():
    """執行所有爬蟲範例"""
    print("\n=== 執行所有爬蟲範例 ===")
    
    manager = CrawlerManager()
    keyword = "耳機"
    
    # 同時執行所有爬蟲
    results = manager.run_all_crawlers(keyword, max_products=15)
    
    # 保存結果
    manager.save_results(keyword, results)
    
    # 顯示統計資訊
    manager.print_statistics(keyword)
    
    # 合併結果
    merged_products = manager.merge_results(keyword)
    print(f"合併後共 {len(merged_products)} 個商品")

def example_specific_platforms():
    """指定特定平台執行範例"""
    print("\n=== 指定平台執行範例 ===")
    
    manager = CrawlerManager()
    keyword = "手機"
    
    # 只執行PChome和Yahoo爬蟲
    platforms = ["pchome", "yahoo"]
    results = manager.run_all_crawlers(keyword, max_products=20, platforms=platforms)
    
    # 保存結果
    manager.save_results(keyword, results)
    
    # 顯示統計
    manager.print_statistics(keyword)

def example_compare_platforms():
    """平台比較分析範例"""
    print("\n=== 平台比較分析範例 ===")
    
    manager = CrawlerManager()
    keyword = "筆電"
    
    # 執行所有爬蟲
    results = manager.run_all_crawlers(keyword, max_products=30)
    
    # 獲取詳細統計
    stats = manager.get_statistics(keyword)
    
    print(f"\n關鍵字: {keyword}")
    print("平台比較:")
    for platform, platform_stats in stats["platforms"].items():
        if platform_stats["status"] == "success":
            print(f"  {platform.upper()}: {platform_stats['product_count']} 個商品, "
                  f"執行時間: {platform_stats['execution_time']:.2f}秒")
        else:
            print(f"  {platform.upper()}: 執行失敗 - {platform_stats['error']}")

def example_custom_analysis():
    """自訂分析範例"""
    print("\n=== 自訂分析範例 ===")
    
    manager = CrawlerManager()
    keyword = "滑鼠"
    
    # 執行爬蟲
    results = manager.run_all_crawlers(keyword, max_products=25)
    
    # 自訂分析：找出最便宜和最貴的商品
    all_products = []
    for platform, result in results.items():
        if result.get("status") == "success":
            for product in result.get("products", []):
                product["source_platform"] = platform
                all_products.append(product)
    
    if all_products:
        # 按價格排序
        all_products.sort(key=lambda x: x.get("price", 0))
        
        cheapest = all_products[0]
        most_expensive = all_products[-1]
        
        print(f"\n最便宜商品:")
        print(f"  名稱: {cheapest['title']}")
        print(f"  價格: NT$ {cheapest['price']}")
        print(f"  平台: {cheapest['source_platform'].upper()}")
        
        print(f"\n最貴商品:")
        print(f"  名稱: {most_expensive['title']}")
        print(f"  價格: NT$ {most_expensive['price']}")
        print(f"  平台: {most_expensive['source_platform'].upper()}")
        
        # 計算各平台平均價格
        platform_prices = {}
        for product in all_products:
            platform = product["source_platform"]
            price = product.get("price", 0)
            if platform not in platform_prices:
                platform_prices[platform] = []
            platform_prices[platform].append(price)
        
        print(f"\n各平台平均價格:")
        for platform, prices in platform_prices.items():
            avg_price = sum(prices) / len(prices) if prices else 0
            print(f"  {platform.upper()}: NT$ {avg_price:.2f}")

def interactive_mode():
    """互動式模式"""
    print("\n=== 互動式模式 ===")
    
    manager = CrawlerManager()
    
    while True:
        print("\n爬蟲管理器選單:")
        print("1. 查看可用爬蟲")
        print("2. 執行單個爬蟲")
        print("3. 執行所有爬蟲")
        print("4. 查看歷史結果統計")
        print("5. 退出")
        
        choice = input("請選擇操作 (1-5): ").strip()
        
        if choice == "1":
            print(f"可用爬蟲: {', '.join(manager.list_crawlers())}")
        
        elif choice == "2":
            platform = input("請輸入平台名稱 (pchome/yahoo/routn): ").strip()
            if platform not in manager.list_crawlers():
                print(f"不支援的平台: {platform}")
                continue
            
            keyword = input("請輸入搜索關鍵字: ").strip()
            max_products = int(input("請輸入最大商品數量 (預設20): ").strip() or "20")
            
            result = manager.run_single_crawler(platform, keyword, max_products)
            print(f"爬蟲完成，獲取到 {result['total_products']} 個商品")
        
        elif choice == "3":
            keyword = input("請輸入搜索關鍵字: ").strip()
            max_products = int(input("請輸入每個平台最大商品數量 (預設20): ").strip() or "20")
            
            results = manager.run_all_crawlers(keyword, max_products)
            manager.save_results(keyword, results)
            manager.print_statistics(keyword)
        
        elif choice == "4":
            keyword = input("請輸入要查看統計的關鍵字: ").strip()
            if keyword in manager.results:
                manager.print_statistics(keyword)
            else:
                print(f"找不到關鍵字 '{keyword}' 的結果")
        
        elif choice == "5":
            print("感謝使用爬蟲管理器！")
            break
        
        else:
            print("無效的選擇，請重新輸入")

if __name__ == "__main__":
    print("爬蟲管理器使用範例")
    print("=" * 50)
    
    # 執行各種範例
    try:
        example_basic_usage()
        example_run_all()
        example_specific_platforms()
        example_compare_platforms()
        example_custom_analysis()
        
        # 詢問是否進入互動模式
        use_interactive = input("\n是否進入互動模式？(y/n): ").strip().lower()
        if use_interactive == 'y':
            interactive_mode()
    
    except KeyboardInterrupt:
        print("\n程式已停止")
    except Exception as e:
        print(f"\n執行時發生錯誤: {e}")
