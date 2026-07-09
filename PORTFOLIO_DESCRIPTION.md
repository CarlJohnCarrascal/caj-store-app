# Caj-Store: AI-Powered Small Business Management & POS System

## Project Overview
Caj-Store is a comprehensive, multi-tenant Business Management and Point of Sale (POS) application designed to streamline operations for small businesses. Built with a focus on speed, reliability, and cutting-edge technology, it integrates advanced AI features to automate tedious data entry and provide actionable business insights.

## Core Features

### 1. Modern POS Interface
- **Collapsible Checkout System**: A highly responsive, space-efficient POS layout with a real-time cart.
- **Multi-Service Support**: Handles traditional product sales alongside specialized services like Printing, E-loading, and Financial Transactions (Cash In/Out).
- **Barcode Integration**: Supports both physical USB/Bluetooth scanners and mobile camera scanning for rapid checkout.

### 2. Generative AI & Automation (via Genkit)
- **AI Receipt OCR**: Automatically extracts structured transaction data from SMS notifications and images of receipts using Google Gemini Vision models.
- **Intelligent Content Creation**: Generates professional, e-commerce-ready product descriptions and high-quality product images from simple text prompts.
- **Usage & Cost Tracking**: Built-in system for monitoring AI token consumption and estimating monthly costs per user.

### 3. Financial & Inventory Management
- **Store-specific Inventories**: Manage stock levels, low-stock alerts, and detailed historical stock movement logs.
- **Financial Accounting**: Track business expenses, manage multiple bank/e-wallet accounts, and monitor customer credit/debit balances.
- **Multi-Tenant Architecture**: Secure store-switching mechanism allowing users to manage or join multiple business entities with distinct roles (Owner/Admin/Member).

### 4. Comprehensive Analytics
- Real-time dashboards visualizing sales trends (daily, weekly, monthly, yearly).
- Detailed reporting on product performance, customer growth, and service-specific revenue (e.g., Printing or E-loading fees).

## Technical Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS.
- **UI Components**: ShadCN UI (Radix UI primitives), Lucide Icons.
- **Backend & Database**: Firebase Realtime Database for instant synchronization.
- **Authentication**: Firebase Auth (Google & Email/Password).
- **AI Engine**: Firebase Genkit with Google Gemini 1.5/2.0 Flash models.
- **Local Persistence**: IndexedDB (via `idb`) for offline caching and performance.
- **Hosting**: Firebase App Hosting.

## Key Accomplishments
- **Real-time Performance**: Implemented persistent Firebase listeners to ensure inventory and sales data are synced across all devices instantly.
- **Complex Data Modeling**: Designed a hierarchical database structure that supports scalable store management and granular activity logging.
- **Human-Centric Design**: Optimized for high-traffic environments with minimum width constraints (1024px) and adaptive view modes.
