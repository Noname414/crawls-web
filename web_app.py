"""
爬蟲結果展示網頁應用
使用Flask建立Web介面來顯示和管理爬蟲結果
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
import glob
from datetime import datetime
from crawler_manager import CrawlerManager

app = Flask(__name__)

# 設定靜態檔案路徑
app.static_folder = 'static'
app.template_folder = 'templates'

# 初始化爬蟲管理器
crawler_manager = CrawlerManager()

@app.route('/')
def index():
    """主頁面"""
    return render_template('index.html')

@app.route('/api/crawlers')
def get_crawlers():
    """獲取可用的爬蟲列表"""
    return jsonify({
        'crawlers': crawler_manager.list_crawlers(),
        'status': 'success'
    })

@app.route('/api/results')
def get_results():
    """獲取所有爬蟲結果檔案"""
    results_dir = crawler_manager.output_dir
    files = []
    
    # 搜尋所有JSON檔案
    json_files = glob.glob(os.path.join(results_dir, "*.json"))
    
    for file_path in json_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            file_info = {
                'filename': os.path.basename(file_path),
                'filepath': file_path,
                'keyword': data.get('keyword', 'unknown'),
                'total_products': data.get('total_products', 0),
                'crawl_time': data.get('crawl_time', ''),
                'file_size': os.path.getsize(file_path),
                'platforms': list(data.get('results', {}).keys()) if 'results' in data else [data.get('platform', 'unknown')]
            }
            files.append(file_info)
        except Exception as e:
            print(f"讀取檔案 {file_path} 失敗: {e}")
    
    # 按時間排序（最新的在前面）
    files.sort(key=lambda x: x['crawl_time'], reverse=True)
    
    return jsonify({
        'files': files,
        'status': 'success'
    })

@app.route('/api/result/<filename>')
def get_result_detail(filename):
    """獲取特定結果檔案的詳細內容"""
    file_path = os.path.join(crawler_manager.output_dir, filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': '檔案不存在'}), 404
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            'data': data,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': f'讀取檔案失敗: {str(e)}'}), 500

@app.route('/api/crawl', methods=['POST'])
def start_crawl():
    """啟動新的爬蟲任務"""
    try:
        data = request.get_json()
        keyword = data.get('keyword', '')
        platforms = data.get('platforms', [])
        max_products = int(data.get('max_products', 100))
        min_price = int(data.get('min_price', 0))
        max_price = int(data.get('max_price', 999999))
        
        if not keyword:
            return jsonify({'error': '請輸入搜索關鍵字'}), 400
        
        if not platforms:
            platforms = crawler_manager.list_crawlers()
        
        # 執行爬蟲
        results = crawler_manager.run_all_crawlers(
            keyword=keyword,
            max_products=max_products,
            min_price=min_price,
            max_price=max_price,
            platforms=platforms
        )
        
        # 保存結果
        filename = crawler_manager.save_results(keyword, results)
        
        return jsonify({
            'status': 'success',
            'message': '爬蟲執行完成',
            'filename': os.path.basename(filename),
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': f'爬蟲執行失敗: {str(e)}'}), 500

@app.route('/api/statistics/<filename>')
def get_statistics(filename):
    """獲取特定結果的統計資訊"""
    file_path = os.path.join(crawler_manager.output_dir, filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': '檔案不存在'}), 404
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 計算統計資訊
        stats = {
            'keyword': data.get('keyword', ''),
            'total_products': 0,
            'platforms': {},
            'price_stats': {
                'min': float('inf'),
                'max': 0,
                'average': 0,
                'total': 0
            }
        }
        
        all_prices = []
        
        # 處理新格式（包含多個平台）
        if 'results' in data:
            results = data['results']
            for platform, result in results.items():
                platform_stats = {
                    'product_count': result.get('total_products', 0),
                    'status': result.get('status', 'unknown'),
                    'execution_time': result.get('execution_time', 0)
                }
                stats['platforms'][platform] = platform_stats
                stats['total_products'] += platform_stats['product_count']
                
                # 收集價格
                for product in result.get('products', []):
                    price = product.get('price', 0)
                    if price > 0:
                        all_prices.append(price)
        
        # 處理舊格式（單一平台）
        elif 'products' in data:
            platform = data.get('platform', 'unknown')
            stats['platforms'][platform] = {
                'product_count': len(data['products']),
                'status': 'success',
                'execution_time': 0
            }
            stats['total_products'] = len(data['products'])
            
            for product in data['products']:
                price = product.get('price', 0)
                if price > 0:
                    all_prices.append(price)
        
        # 計算價格統計
        if all_prices:
            stats['price_stats']['min'] = min(all_prices)
            stats['price_stats']['max'] = max(all_prices)
            stats['price_stats']['average'] = sum(all_prices) / len(all_prices)
            stats['price_stats']['total'] = len(all_prices)
        else:
            stats['price_stats']['min'] = 0
        
        return jsonify({
            'statistics': stats,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': f'統計計算失敗: {str(e)}'}), 500

@app.route('/view/<filename>')
def view_result(filename):
    """查看特定結果的詳細頁面"""
    return render_template('result_detail.html', filename=filename)

@app.route('/crawler')
def crawler_page():
    """爬蟲執行頁面"""
    return render_template('crawler.html')

if __name__ == '__main__':
    # 確保templates和static目錄存在
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    print("爬蟲結果展示網站啟動中...")
    print("請訪問: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
