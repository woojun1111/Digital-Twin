@echo off
if not exist "%~dp0web\index.html" (
 echo Missing web/index.html. Extract the complete ZIP first.
 pause
 exit /b 1
)
start "" "%~dp0web\index.html"
