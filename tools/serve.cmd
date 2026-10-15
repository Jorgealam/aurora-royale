@echo off
rem Servidor local sem instalar Node.js: usa o runtime Electron empacotado como Node.
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\Windows\AuroraRoyale.exe" "%~dp0server.cjs"
