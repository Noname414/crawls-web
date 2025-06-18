// 爬蟲執行頁面的JavaScript功能
let availableCrawlers = [];
let currentResults = null;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    loadCrawlers();
    setupFormHandlers();
    setupViewModeHandlers();
});

// 載入可用的爬蟲
async function loadCrawlers() {
    try {
        const response = await fetch('/api/crawlers');
        const data = await response.json();
        
        if (data.status === 'success') {
            availableCrawlers = data.crawlers;
            renderCrawlerOptions();
        } else {
            console.error('載入爬蟲列表失敗');
        }
    } catch (error) {
        console.error('載入爬蟲列表時發生錯誤:', error);
    }
}

// 渲染爬蟲選項
function renderCrawlerOptions() {
    const container = document.getElementById('platformsList');
    container.innerHTML = '';
    
    availableCrawlers.forEach(crawler => {
        const div = document.createElement('div');
        div.className = 'form-check';
        
        div.innerHTML = `
            <input class="form-check-input platform-checkbox" type="checkbox" 
                   value="${crawler}" id="platform_${crawler}">
            <label class="form-check-label" for="platform_${crawler}">
                <i class="fas fa-shopping-cart me-2"></i>
                ${crawler.toUpperCase()}
            </label>
        `;
        
        container.appendChild(div);
    });
}

// 設定表單處理器
function setupFormHandlers() {
    // 全選功能
    document.getElementById('selectAll').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.platform-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });
    
    // 個別平台選擇
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('platform-checkbox')) {
            updateSelectAllState();
        }
    });
    
    // 表單提交
    document.getElementById('crawlerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        startCrawl();
    });
}

// 更新全選狀態
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.platform-checkbox');
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkedCount = document.querySelectorAll('.platform-checkbox:checked').length;
    
    if (checkedCount === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// 開始爬蟲
async function startCrawl() {
    // 獲取表單資料
    const keyword = document.getElementById('keyword').value.trim();
    const selectedPlatforms = Array.from(document.querySelectorAll('.platform-checkbox:checked'))
                                  .map(cb => cb.value);
    const maxProducts = parseInt(document.getElementById('maxProducts').value);
    const minPrice = parseInt(document.getElementById('minPrice').value);
    const maxPrice = parseInt(document.getElementById('maxPrice').value);
    
    // 驗證輸入
    if (!keyword) {
        alert('請輸入搜尋關鍵字');
        return;
    }
    
    if (selectedPlatforms.length === 0) {
        alert('請至少選擇一個爬蟲平台');
        return;
    }
    
    if (minPrice > maxPrice) {
        alert('最低價格不能大於最高價格');
        return;
    }
    
    // 顯示進度
    showProgress(true);
    updateProgressText('正在準備爬蟲任務...');
    
    try {
        const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keyword: keyword,
                platforms: selectedPlatforms,
                max_products: maxProducts,
                min_price: minPrice,
                max_price: maxPrice
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentResults = data.results;
            showProgress(false);
            showResults(data);
        } else {
            showProgress(false);
            showError(data.error || '爬蟲執行失敗');
        }
        
    } catch (error) {
        showProgress(false);
        showError('網路錯誤：' + error.message);
    }
}

// 顯示進度
function showProgress(show) {
    const progressCard = document.getElementById('progressCard');
    const resultCard = document.getElementById('resultCard');
    const startBtn = document.getElementById('startCrawlBtn');
    
    if (show) {
        progressCard.style.display = 'block';
        resultCard.style.display = 'none';
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>執行中...';
    } else {
        progressCard.style.display = 'none';
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play me-2"></i>開始爬蟲';
    }
}

// 更新進度文字
function updateProgressText(text) {
    document.getElementById('progressText').textContent = text;
}

// 顯示結果
function showResults(data) {
    const resultCard = document.getElementById('resultCard');
    const summaryContainer = document.getElementById('resultSummary');
    const platformTableBody = document.getElementById('platformResultsTable');
    
    // 計算總商品數
    const totalProducts = Object.values(data.results)
                                .reduce((sum, result) => sum + result.total_products, 0);
    
    // 計算成功/失敗平台數
    const successCount = Object.values(data.results)
                               .filter(result => result.status === 'success').length;
    const totalPlatforms = Object.keys(data.results).length;
    
    // 更新摘要
    summaryContainer.innerHTML = `
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h4 class="text-primary">${totalProducts.toLocaleString()}</h4>
                    <p class="card-text">總商品數</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h4 class="text-success">${successCount}</h4>
                    <p class="card-text">成功平台</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h4 class="text-danger">${totalPlatforms - successCount}</h4>
                    <p class="card-text">失敗平台</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h4 class="text-info">${data.filename}</h4>
                    <p class="card-text">結果檔案</p>
                </div>
            </div>
        </div>
    `;
    
    // 更新平台結果表格
    platformTableBody.innerHTML = '';
    Object.entries(data.results).forEach(([platform, result]) => {
        const row = document.createElement('tr');
        
        const statusIcon = result.status === 'success' ? 
            '<i class="fas fa-check-circle text-success"></i>' : 
            '<i class="fas fa-times-circle text-danger"></i>';
        
        const statusText = result.status === 'success' ? '成功' : '失敗';
        
        row.innerHTML = `
            <td><span class="badge bg-secondary">${platform.toUpperCase()}</span></td>
            <td>${statusIcon} ${statusText}</td>
            <td>${result.total_products.toLocaleString()}</td>
            <td>${result.execution_time ? result.execution_time.toFixed(2) + 's' : '-'}</td>
        `;
        
        platformTableBody.appendChild(row);
    });
    
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

// 查看詳細結果
function viewDetailedResults() {
    if (currentResults) {
        // 獲取結果檔案名稱
        const keyword = document.getElementById('keyword').value.trim();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `crawler_results_${keyword}_${timestamp}.json`;
        
        // 跳轉到詳細頁面
        window.location.href = `/view/${filename}`;
    }
}

// 顯示錯誤
function showError(errorMessage) {
    document.getElementById('errorModalBody').textContent = errorMessage;
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
}

// 重設表單
function resetForm() {
    document.getElementById('crawlerForm').reset();
    document.getElementById('selectAll').checked = false;
    document.getElementById('selectAll').indeterminate = false;
    
    // 重設進度和結果顯示
    document.getElementById('progressCard').style.display = 'none';
    document.getElementById('resultCard').style.display = 'none';
    
    currentResults = null;
}

// 設定視圖模式處理器（如果有需要）
function setupViewModeHandlers() {
    // 預留給未來功能
}

// 價格範圍驗證
document.getElementById('minPrice').addEventListener('change', function() {
    const minPrice = parseInt(this.value);
    const maxPrice = parseInt(document.getElementById('maxPrice').value);
    
    if (minPrice > maxPrice) {
        document.getElementById('maxPrice').value = minPrice;
    }
});

document.getElementById('maxPrice').addEventListener('change', function() {
    const maxPrice = parseInt(this.value);
    const minPrice = parseInt(document.getElementById('minPrice').value);
    
    if (maxPrice < minPrice) {
        document.getElementById('minPrice').value = maxPrice;
    }
});

// 商品數量驗證
document.getElementById('maxProducts').addEventListener('change', function() {
    const value = parseInt(this.value);
    if (value < 1) {
        this.value = 1;
    } else if (value > 1000) {
        this.value = 1000;
    }
});
