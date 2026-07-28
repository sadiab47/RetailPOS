# RetailPOS – User Manual & System Guide

Welcome to the **RetailPOS** system. This manual provides step-by-step instructions on system requirements, installation, configuration, operational features, database backups, and troubleshooting.

---

## 1. Introduction

RetailPOS is a modern, high-performance web-based Point of Sale (POS) and inventory management platform designed for retailers. 

### Core Features:
- **Real-time Inventory Control:** Track catalog items, set automatic low-stock alerts, and manage category/supplier profiles.
- **Intelligent POS Checkout:** Dynamic product search autocomplete, cart items management, discount/tax calculations, and custom payment options (Cash, Card, Mobile Wallet).
- **Thermal Receipts Generation:** Formatted specifically for standard 80mm roll printer templates.
- **Inventory Ledger Logs:** Centralized historical tracking for every single stock entry, adjustment, and sale transaction.
- **Secure Authentication:** Role-based access controls protecting system screens.

---

## 2. System Requirements

### Minimum Configuration:
- **OS:** Windows 10 or Windows 11 (64-bit)
- **Runtime:** Node.js LTS (v18 or higher)
- **Database:** MySQL Server (e.g., via XAMPP)
- **Memory:** 4 GB RAM
- **Storage:** 500 MB free disk space

### Recommended Hardware:
- **Memory:** 8 GB RAM
- **Storage:** SSD storage for high-velocity database access
- **Peripherals:**
  - Standard 80mm USB or Network Thermal Receipt Printer
  - USB Barcode Scanner (configured in keyboard emulation mode)

---

## 3. Installation Guide

Follow these steps to deploy and run RetailPOS on a new Windows machine:

### Step 1: Install XAMPP (MySQL)
1. Download and install XAMPP from [apachefriends.org](https://www.apachefriends.org/).
2. Open the **XAMPP Control Panel** and click **Start** next to the **MySQL** service.
3. Access phpMyAdmin at `http://localhost/phpmyadmin` to verify that your MySQL server is running.

### Step 2: Extract the Release Folder
Extract the `RetailPOS/` package folder onto your local drive (e.g. `C:\RetailPOS` or `E:\RetailPOS`).

### Step 3: Run the Installer
1. Double-click the file **`install.bat`** in the root project folder.
2. The script will verify Node.js, install all node dependencies, automatically configure the backend `.env` variables, and build the optimized production builds.
3. It will also create the database schema `retailpos` and seed the initial administrator credentials.

---

## 4. First-Time Setup & Operations

### Step 1: Administrator Login
1. Start the services (see *Daily Operations* below).
2. Open `http://localhost:3000` in your web browser.
3. Log in with the pre-seeded admin credentials:
   - **Email:** `admin@retailpos.com`
   - **Password:** `admin123`
4. *Recommendation:* Update your password upon logging in.

### Step 2: Create Categories & Suppliers
1. Navigate to the **Categories** tab and add your product categories (e.g. *Beverages*, *Cosmetics*).
2. Go to the **Suppliers** tab and register supplier contacts.

### Step 3: Add Products
1. Open the **Products** tab.
2. Enter the Product Name, Cost Price, Selling Price, Barcode, SKU, low-stock threshold, supplier, and category.
3. Click **Add Product**.

---

## 5. Daily Operations & POS Terminal

### Launching the Application
Double-click **`run.bat`** in the root project folder. This will:
1. Start both the NestJS backend and Next.js frontend services in production mode.
2. Monitor and wait for ports 4000 and 3000 to become active.
3. Automatically launch your default web browser and open the application.

### Stopping the Services
When the cashier shifts end:
1. Close the browser window.
2. Press any key in the active `run.bat` command console to automatically trigger **`stop.bat`**, which gracefully terminates the processes and releases the occupied network ports.

### Using the POS Terminal
1. Open the **POS Terminal** tab.
2. **Scan/Search Items:** 
   - You can type in the search input to dynamically search for products by name, SKU, or barcode and click the suggestion to insert it.
   - If using a USB barcode scanner, simply scan the item's barcode. The scanner hook will capture the input and append it to the cart.
3. **Cart Operations:** Adjust item quantities, apply discounts or taxes, and input custom customer names.
4. **Checkout:** Select the payment mode (Cash, Card, Mobile) and click **Complete checkout**.
5. **Print Receipt:** Click the **Print Receipt** button in the preview window to print a receipt formatted for 80mm thermal printers.

---

## 6. Backup & Restore Guide

### Creating a Database Backup
Double-click **`backup.bat`**. This will extract your current database state and save it under the `backups/` directory as `RetailPOS_YYYY-MM-DD_HH-MM.sql`.

### Restoring from a Backup
Double-click **`restore.bat`**. The CLI utility will list all available backup files. Enter the number corresponding to the backup you wish to import, and press **Enter**.

*Recommendation: Set up a daily backup schedule at the end of every cashier shift.*

---

## 7. Troubleshooting & Support

### Issue: "Database connection failed" during installation
- **Cause:** MySQL Server is not running.
- **Solution:** Verify XAMPP Control Panel shows MySQL active on port 3306.

### Issue: "Port 3000 or 4000 already in use"
- **Cause:** A previous instance of the server is still running.
- **Solution:** Run **`stop.bat`** to force terminate orphan processes and release occupied ports.

### Issue: Barcode scanner doesn't add items
- **Cause:** The focus is inside an input field where the scanner's typed text is captured instead of the scanner listener.
- **Solution:** Unfocus/click outside the search inputs before scanning, or scan directly with the search bar focused to search automatically.

---

*System developed by Saad Qazi (+92 320 7480116)*
