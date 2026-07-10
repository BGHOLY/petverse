@echo off
chcp 65001 >nul
set PROJECT=D:\GITHUB\petverse\client\PetVerseClient
echo 正在清理 Cocos 临时缓存...
if exist "%PROJECT%\temp" rmdir /s /q "%PROJECT%\temp"
if exist "%PROJECT%\library" rmdir /s /q "%PROJECT%\library"
echo 清理完成，请用 Cocos Creator 3.8.8 重新打开项目。
pause
