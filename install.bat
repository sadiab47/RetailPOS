@echo off
title RetailPOS Installer Setup
echo ===================================================
echo             RetailPOS Installation Setup           
echo ===================================================
echo.

:: 1. Verify Node.js and NPM
echo [1/6] Verifying system prerequisites...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed on this system.
    echo Please download and install Node.js from https://nodejs.org/ before continuing.
    pause
    exit /b 1
)
echo ✓ Node.js verified.

npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm is not available. Please verify your Node.js installation.
    pause
    exit /b 1
)
echo ✓ npm verified.

:: 2. Configure Environment variables
echo.
echo [2/6] Configuring environment settings...
if not exist "backend\.env" (
    if exist ".env.example" (
        copy ".env.example" "backend\.env" >nul
        echo ✓ Generated backend\.env configuration from .env.example.
    ) else (
        echo ERROR: .env.example template file is missing.
        pause
        exit /b 1
    )
) else (
    echo ✓ backend\.env configuration already exists.
)

:: 3. Install packages
echo.
echo [3/6] Installing package dependencies...
echo Running npm install...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install project dependencies.
    pause
    exit /b 1
)
echo ✓ Project dependencies installed successfully.

:: 4. Verify Database
echo.
echo [4/6] Connecting to MySQL Database & Running migrations...
node database/check_db.js >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Cannot establish connection to MySQL database.
    echo Please verify that XAMPP / MySQL Server is running on port 3306.
    echo.
    set /p DB_CONFIRM="Do you want to ignore database errors and proceed with build anyway? (y/n): "
    if /i "%DB_CONFIRM%" neq "y" (
        exit /b 1
    )
) else (
    echo ✓ Database connection verified.
    echo Running migrations and seed...
    call node database/migrate.js
    call node database/seed.js
    echo ✓ Database migrations and seeding completed.
)

:: 5. Generate Production Builds
echo.
echo [5/6] Generating production builds (This may take a minute)...
echo Building backend...
call npm run build --workspace backend
if %errorlevel% neq 0 (
    echo ERROR: Backend build failed.
    pause
    exit /b 1
)
echo ✓ Backend build generated.

echo Building frontend...
call npm run build --workspace frontend
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
echo ✓ Frontend build generated.

:: 6. Display Setup Summary
echo.
echo ===================================================
echo             RetailPOS Installed Successfully!      
echo ===================================================
echo.
echo You can now use the following utilities:
echo  - run.bat     : Starts both frontend & backend servers
echo  - stop.bat    : Gracefully terminates active servers
echo  - backup.bat  : Backs up the MySQL database
echo  - restore.bat : Restores the database from a backup
echo.
pause
