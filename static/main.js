// 主頁面的JavaScript功能
let allResults = [];
let filteredResults = [];

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    loadResults();
    loadPlatforms();
});

// 載入所有結果
async function loadResults() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/results');
        const data = await response.json();
        
        if (data.status === 'success') {
            allResults = data.files;
            filteredResults = [...allResults];
            updateUI();
            updateStatistics();
        } else {
            console.error('載入結果失敗:', data.error);
            showEmptyMessage();
        }
    } catch (error) {
        console.error('載入結果時發生錯誤:', error);
        showEmptyMessage();
    } finally {
        showLoading(false);
    }
}

// 載入可用平台
async function loadPlatforms() {
    try {
        const response = await fetch('/api/crawlers');
        const data = await response.json();
        
        if (data.status === 'success') {
            const platformSelect = document.getElementById('filterPlatform');
            data.crawlers.forEach(platform => {
                const option = document.createElement('option');
                option.value = platform;
                option.textContent = platform.toUpperCase();
                platformSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('載入平台列表失敗:', error);
    }
}

// 更新UI
function updateUI() {
    const tableBody = document.getElementById('resultsTableBody');
    
    if (filteredResults.length === 0) {
        showEmptyMessage();
        return;
    }
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 添加結果行
    filteredResults.forEach(result => {
        const row = createResultRow(result);
        tableBody.appendChild(row);
    });
    
    document.getElementById('emptyMessage').style.display = 'none';
}

// 建立結果行
function createResultRow(result) {
    const row = document.createElement('tr');
    row.className = 'fade-in';
    
    // 格式化時間
    const crawlTime = new Date(result.crawl_time).toLocaleString('zh-TW');
    
    // 格式化檔案大小
    const fileSize = formatFileSize(result.file_size);
    
    // 平台標籤
    const platformBadges = result.platforms.map(platform => 
        `<span class="badge bg-secondary me-1">${platform.toUpperCase()}</span>`
    ).join('');
    
    row.innerHTML = `
        <td>
            <strong>${result.keyword}</strong>
        </td>
        <td>
            <span class="text-primary fw-bold">${result.total_products.toLocaleString()}</span>
        </td>
        <td>
            ${platformBadges}
        </td>
        <td>
            <small class="text-muted">${crawlTime}</small>
        </td>
        <td>
            <small class="text-muted">${fileSize}</small>
        </td>
        <td>
            <div class="btn-group btn-group-sm" role="group">
                <button class="btn btn-outline-primary" onclick="viewResult('${result.filename}')" title="查看詳細">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-info" onclick="showStatistics('${result.filename}')" title="統計資訊">
                    <i class="fas fa-chart-bar"></i>
                </button>
                <button class="btn btn-outline-success" onclick="downloadResult('${result.filename}')" title="下載">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// 更新統計資訊
function updateStatistics() {
    const totalFiles = allResults.length;
    const totalProducts = allResults.reduce((sum, result) => sum + result.total_products, 0);
    
    // 獲取唯一平台數
    const allPlatforms = new Set();
    allResults.forEach(result => {
        result.platforms.forEach(platform => allPlatforms.add(platform));
    });
    
    // 最新爬蟲時間
    const latestResult = allResults.length > 0 ? allResults[0] : null;
    const latestTime = latestResult ? 
        new Date(latestResult.crawl_time).toLocaleDateString('zh-TW') : 
        '無';
    
    // 更新統計卡片
    document.getElementById('totalFiles').textContent = totalFiles;
    document.getElementById('totalProducts').textContent = totalProducts.toLocaleString();
    document.getElementById('totalPlatforms').textContent = allPlatforms.size;
    document.getElementById('latestCrawl').textContent = latestTime;
}

// 套用篩選
function applyFilters() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase();
    const platform = document.getElementById('filterPlatform').value;
    
    filteredResults = allResults.filter(result => {
        const matchKeyword = !keyword || result.keyword.toLowerCase().includes(keyword);
        const matchPlatform = !platform || result.platforms.includes(platform);
        
        return matchKeyword && matchPlatform;
    });
    
    updateUI();
}

// 重新整理結果
function refreshResults() {
    loadResults();
}

// 查看結果詳細
function viewResult(filename) {
    window.location.href = `/view/${filename}`;
}

// 顯示統計資訊
async function showStatistics(filename) {
    try {
        const response = await fetch(`/api/statistics/${filename}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const stats = data.statistics;
            const modalBody = document.getElementById('statsModalBody');
            
            modalBody.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6>基本資訊</h6>
                        <ul class="list-unstyled">
                            <li><strong>關鍵字:</strong> ${stats.keyword}</li>
                            <li><strong>總商品數:</strong> ${stats.total_products.toLocaleString()}</li>
                            <li><strong>平台數量:</strong> ${Object.keys(stats.platforms).length}</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6>價格統計</h6>
                        <ul class="list-unstyled">
                            <li><strong>平均價格:</strong> NT$ ${stats.price_stats.average.toFixed(2)}</li>
                            <li><strong>最低價格:</strong> NT$ ${stats.price_stats.min.toLocaleString()}</li>
                            <li><strong>最高價格:</strong> NT$ ${stats.price_stats.max.toLocaleString()}</li>
                        </ul>
                    </div>
                </div>
                
                <h6>各平台詳細</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>平台</th>
                                <th>狀態</th>
                                <th>商品數量</th>
                                <th>執行時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(stats.platforms).map(([platform, data]) => `
                                <tr>
                                    <td><span class="badge bg-secondary">${platform.toUpperCase()}</span></td>
                                    <td>
                                        ${data.status === 'success' ? 
                                            '<i class="fas fa-check-circle text-success"></i> 成功' : 
                                            '<i class="fas fa-times-circle text-danger"></i> 失敗'
                                        }
                                    </td>
                                    <td>${data.product_count.toLocaleString()}</td>
                                    <td>${data.execution_time.toFixed(2)}s</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('statsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('載入統計資訊失敗:', error);
        alert('載入統計資訊失敗');
    }
}

// 下載結果
function downloadResult(filename) {
    const link = document.createElement('a');
    link.href = `/api/result/${filename}`;
    link.download = filename;
    link.click();
}

// 顯示載入狀態
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const table = document.querySelector('.table-responsive');
    
    if (show) {
        spinner.style.display = 'block';
        if (table) table.style.display = 'none';
    } else {
        spinner.style.display = 'none';
        if (table) table.style.display = 'block';
    }
}

// 顯示空訊息
function showEmptyMessage() {
    document.getElementById('emptyMessage').style.display = 'block';
    document.querySelector('.table-responsive').style.display = 'none';
}

// 格式化檔案大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 搜尋功能 - 即時搜尋
document.getElementById('searchKeyword').addEventListener('input', function() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
        applyFilters();
    }, 300);
});

// 平台篩選
document.getElementById('filterPlatform').addEventListener('change', applyFilters);
