@echo off

:loop
cd /d "%~dp0"

rem Folder refresh
dir > nul

timeout /t 10 /nobreak > nul

goto loop