@echo off
echo 正在啟動爬蟲結果展示網站...
echo.

REM 檢查是否安裝了Python
python --version >nul 2>&1
if errorlevel 1 (
    echo 錯誤：未找到Python，請先安裝Python 3.7或更高版本
    pause
    exit /b 1
)

REM 檢查是否安裝了Flask
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo 正在安裝必要的套件...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo 套件安裝失敗，請檢查網路連接或手動安裝
        pause
        exit /b 1
    )
)

echo 套件檢查完成，正在啟動網站...
echo.
echo 網站將在瀏覽器中自動開啟
echo 網址：http://localhost:5000
echo.
echo 按 Ctrl+C 停止服務
echo.

REM 啟動Flask應用
python web_app.py

pause
