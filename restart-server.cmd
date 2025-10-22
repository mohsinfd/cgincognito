@echo off
echo ========================================
echo CardGenius - Restarting Dev Server
echo ========================================
echo.
cd "c:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
echo Current directory: %CD%
echo.
echo Starting npm dev server on PORT 3000...
echo Press Ctrl+C to stop the server when done
echo.
set PORT=3000
npm run dev

