// 結果詳情頁面的JavaScript功能
let resultData = null;
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12;

// 頁面載入完成後初始化
document.addEventListener("DOMContentLoaded", function () {
  loadResultData();
  setupEventHandlers();
});

// 載入結果資料
async function loadResultData() {
  try {
    const response = await fetch(`/api/result/${filename}`);
    const data = await response.json();

    if (data.status === "success") {
      resultData = data.data;
      processResultData();
      updateUI();
    } else {
      console.error("載入結果失敗:", data.error);
      showError("載入結果失敗");
    }
  } catch (error) {
    console.error("載入結果時發生錯誤:", error);
    showError("載入結果時發生錯誤");
  } finally {
    hideLoading();
  }
}

// 處理結果資料
function processResultData() {
  allProducts = [];

  // 處理新格式（包含多個平台）
  if (resultData.results) {
    Object.values(resultData.results).forEach((platformResult) => {
      if (platformResult.products) {
        allProducts.push(...platformResult.products);
      }
    });
  }
  // 處理舊格式（單一平台）
  else if (resultData.products) {
    allProducts = resultData.products;
  }

  // 預設按價格由低到高排序
  allProducts.sort((a, b) => (a.price || 0) - (b.price || 0));

  // 初始化篩選結果
  filteredProducts = [...allProducts];

  // 更新標題
  const keyword = resultData.keyword || "未知";
  document.getElementById(
    "resultTitle"
  ).innerHTML = `<i class="fas fa-search me-2"></i>「${keyword}」搜尋結果`;
}

// 更新UI
function updateUI() {
  updateSummaryCards();
  updatePlatformFilter();
  renderProducts();
  updatePagination();
}

// 更新摘要卡片
function updateSummaryCards() {
  const totalProducts = allProducts.length;
  const uniquePlatforms = new Set(allProducts.map((p) => p.platform)).size;

  // 計算價格統計
  const prices = allProducts.map((p) => p.price || 0).filter((p) => p > 0);
  const avgPrice =
    prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  document.getElementById("summaryCards").innerHTML = `
        <div class="col-md-3">
            <div class="card bg-primary text-white">
                <div class="card-body text-center">
                    <h3>${totalProducts.toLocaleString()}</h3>
                    <p class="mb-0">總商品數</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-success text-white">
                <div class="card-body text-center">
                    <h3>${uniquePlatforms}</h3>
                    <p class="mb-0">平台數</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-info text-white">
                <div class="card-body text-center">
                    <h3>NT$ ${avgPrice.toFixed(0)}</h3>
                    <p class="mb-0">平均價格</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card bg-warning text-white">
                <div class="card-body text-center">
                    <h3>NT$ ${minPrice} - ${maxPrice}</h3>
                    <p class="mb-0">價格範圍</p>
                </div>
            </div>
        </div>
    `;
}

// 更新平台篩選
function updatePlatformFilter() {
  const platforms = [...new Set(allProducts.map((p) => p.platform))];
  const filterSelect = document.getElementById("platformFilter");

  filterSelect.innerHTML = '<option value="">全部平台</option>';
  platforms.forEach((platform) => {
    const option = document.createElement("option");
    option.value = platform;
    option.textContent = platform;
    filterSelect.appendChild(option);
  });
}

// 渲染商品
function renderProducts() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageProducts = filteredProducts.slice(startIndex, endIndex);

  // 更新篩選資訊
  document.getElementById("filterInfo").textContent = `顯示 ${
    startIndex + 1
  }-${Math.min(endIndex, filteredProducts.length)} 個商品，共 ${
    filteredProducts.length
  } 個`;

  if (pageProducts.length === 0) {
    showEmptyState();
    return;
  }

  hideEmptyState();

  // 渲染卡片視圖
  renderGridView(pageProducts);

  // 渲染列表視圖
  renderListView(pageProducts);
}

// 渲染卡片視圖
function renderGridView(products) {
  const container = document.getElementById("productsGrid");
  container.innerHTML = "";

  products.forEach((product) => {
    const card = createProductCard(product);
    container.appendChild(card);
  });
}

// 建立商品卡片
function createProductCard(product) {
  const col = document.createElement("div");
  col.className = "col-lg-3 col-md-4 col-sm-6 mb-4";

  const platformClass = `platform-${product.platform
    .toLowerCase()
    .replace(/\s+/g, "")}`;

  col.innerHTML = `
        <div class="card product-card h-100">
            <img src="${product.image_url || "/static/placeholder.jpg"}" 
                 class="card-img-top" alt="${product.title}"
                 onerror="this.src='/static/placeholder.jpg'">
            <div class="card-body d-flex flex-column">
                <h6 class="product-title">${product.title}</h6>
                <div class="mt-auto">
                    <div class="product-price">NT$ ${(
                      product.price || 0
                    ).toLocaleString()}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="product-platform ${platformClass}">${
    product.platform
  }</span>
                        <a href="${
                          product.url
                        }" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

  return col;
}

// 渲染列表視圖
function renderListView(products) {
  const tbody = document.getElementById("productsTableBody");
  tbody.innerHTML = "";

  products.forEach((product) => {
    const row = createProductRow(product);
    tbody.appendChild(row);
  });
}

// 建立商品列表行
function createProductRow(product) {
  const row = document.createElement("tr");

  row.innerHTML = `
        <td>
            <img src="${product.image_url || "/static/placeholder.jpg"}" 
                 class="img-thumbnail" style="width: 60px; height: 60px; object-fit: cover;"
                 alt="${
                   product.title
                 }" onerror="this.src='/static/placeholder.jpg'">
        </td>
        <td>
            <div class="product-title">${product.title}</div>
        </td>
        <td>
            <strong class="text-primary">NT$ ${(
              product.price || 0
            ).toLocaleString()}</strong>
        </td>
        <td>
            <span class="badge bg-secondary">${product.platform}</span>
        </td>
        <td>
            <a href="${
              product.url
            }" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-external-link-alt me-1"></i>查看
            </a>
        </td>
    `;

  return row;
}

// 更新分頁
function updatePagination() {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // 上一頁
  paginationHTML += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${
              currentPage - 1
            })">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

  // 頁碼
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1)">1</a></li>`;
    if (startPage > 2) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a></li>`;
  }

  // 下一頁
  paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${
              currentPage + 1
            })">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

  pagination.innerHTML = paginationHTML;
}

// 變更頁面
function changePage(page) {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderProducts();
  updatePagination();

  // 滾動到頂部
  document.querySelector(".card-header").scrollIntoView({ behavior: "smooth" });
}

// 套用篩選
function applyFilters() {
  const platform = document.getElementById("platformFilter").value;
  const minPrice = parseFloat(document.getElementById("priceMin").value) || 0;
  const maxPrice =
    parseFloat(document.getElementById("priceMax").value) || Infinity;
  const sortBy = document.getElementById("sortBy").value;

  // 篩選
  filteredProducts = allProducts.filter((product) => {
    const matchPlatform = !platform || product.platform === platform;
    const price = product.price || 0;
    const matchPrice = price >= minPrice && price <= maxPrice;

    return matchPlatform && matchPrice;
  });

  // 排序
  switch (sortBy) {
    case "price_asc":
      filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case "price_desc":
      filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case "title_asc":
      filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "platform":
      filteredProducts.sort((a, b) => a.platform.localeCompare(b.platform));
      break;
  }

  currentPage = 1;
  renderProducts();
  updatePagination();
}

// 重設篩選
function resetFilters() {
  document.getElementById("platformFilter").value = "";
  document.getElementById("priceMin").value = "";
  document.getElementById("priceMax").value = "";
  document.getElementById("sortBy").value = "price_asc";

  filteredProducts = [...allProducts];
  currentPage = 1;
  renderProducts();
  updatePagination();
}

// 匯出結果
function exportResults() {
  const dataStr = JSON.stringify(resultData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename;
  link.click();
}

// 設定事件處理器
function setupEventHandlers() {
  // 視圖模式切換
  document.getElementById("gridView").addEventListener("change", function () {
    if (this.checked) {
      document.getElementById("productsGrid").style.display = "block";
      document.getElementById("productsList").style.display = "none";
    }
  });

  document.getElementById("listView").addEventListener("change", function () {
    if (this.checked) {
      document.getElementById("productsGrid").style.display = "none";
      document.getElementById("productsList").style.display = "block";
    }
  });

  // 篩選事件
  document
    .getElementById("platformFilter")
    .addEventListener("change", applyFilters);
  document.getElementById("sortBy").addEventListener("change", applyFilters);

  // 價格篩選（延遲執行）
  let priceTimeout;
  document.getElementById("priceMin").addEventListener("input", function () {
    clearTimeout(priceTimeout);
    priceTimeout = setTimeout(applyFilters, 500);
  });

  document.getElementById("priceMax").addEventListener("input", function () {
    clearTimeout(priceTimeout);
    priceTimeout = setTimeout(applyFilters, 500);
  });
}

// 顯示空狀態
function showEmptyState() {
  document.getElementById("emptyState").style.display = "block";
  document.getElementById("productsGrid").style.display = "none";
  document.getElementById("productsList").style.display = "none";
}

// 隱藏空狀態
function hideEmptyState() {
  document.getElementById("emptyState").style.display = "none";

  // 根據當前視圖模式顯示對應容器
  if (document.getElementById("gridView").checked) {
    document.getElementById("productsGrid").style.display = "block";
    document.getElementById("productsList").style.display = "none";
  } else {
    document.getElementById("productsGrid").style.display = "none";
    document.getElementById("productsList").style.display = "block";
  }
}

// 隱藏載入中
function hideLoading() {
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
}

// 顯示錯誤
function showError(message) {
  document.getElementById("loadingSpinner").innerHTML = `
        <div class="text-center text-danger">
            <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.history.back()">返回</button>
        </div>
    `;
}
