@echo off
setlocal
set "SCOOP_SHIMS=%USERPROFILE%\scoop\shims"
if exist "%SCOOP_SHIMS%" set "Path=%SCOOP_SHIMS%;%Path%"
node "%~dp0hm-mcp-server.mjs" %*
exit /b %ERRORLEVEL%
