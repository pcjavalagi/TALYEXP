# TALYEXP - Expense Manager

**TALYEXP** is a comprehensive full-stack web application designed to streamline personal financial management. It goes beyond simple expense tracking by offering savings management, debt tracking (payables/receivables), recurring transaction automation, future wealth planning, and detailed analytics—all wrapped in a modern, responsive glassmorphism interface.

## 🌟 Key Features

### 💸 Core Financial Tracking
- **Expense Tracking**: Log daily expenses with categories, dates, and titles.
- **Savings Management**: Track monthly savings goals and actuals.
- **Debt Manager**:
    - **Pending Returns (Lent)**: Track money given to others.
    - **Payables (Borrowed)**: Track money to be returned, including due dates.
- **Recurring Transactions**: Set up templates for monthly bills (e.g., Rent, Netflix) or SIPs and post them with a single click each month.

### 🚀 Future Planner (Integrated)
- **Investment Calculator**: Calculate compound interest, required monthly contributions, and income impact.
- **Database Integration**: Save multiple financial plans to your profile for later review.
- **Visualizations**: Interactive Line and Bar charts for wealth projection.
- **PDF Reports**: Download detailed financial plan schedules as PDFs.

### 📊 Analytics & Insights
- **Smart Insights**: Auto-generated advice based on spending habits (e.g., "Spending is up 10% from last month").
- **Interactive Charts**:
    - Monthly Spend Bar Chart
    - Category Breakdown (Bar/Pie)
    - Cash Flow Trends (Line Chart)
    - Income vs. Expense vs. Savings Overview
- **PDF Reporting**: Generate and download Expense Reports for specific months, quarters, or years.

### 🛠 Utilities & User Experience
- **Keep Notes**: Integrated note-taking with color-coded cards and voice input support.
- **Voice Commands**: Add expenses or notes using speech recognition.
- **Settings Popout**: Quick access to Calculator, Contact Form, Recurring setup, and Account actions.
- **Themes**: Toggle between **Dark Mode** (Glassmorphism) and **Light Mode**.
- **Responsive Design**: Fully optimized for Mobile, Tablet, and Desktop usage.

### 🔐 Security & Account Management
- **Authentication**: Secure Registration and Login (bcryptjs hashing).
- **Data Privacy**: "Reset App" to wipe data while keeping the account, or "Delete Account" to permanently remove all user traces.

## 🏗 Tech Stack

- **Frontend**:
  - HTML5, CSS3 (Custom Variables, Glassmorphism UI)
  - JavaScript (ES6+)
  - **Libraries**: Chart.js (Visualizations), jsPDF (Report Generation), FontAwesome (Icons)
- **Backend**:
  - Node.js
  - Express.js
- **Database**:
  - MongoDB (Mongoose ODM)
- **Authentication**:
  - Session Storage implementation, bcryptjs

## 📂 File Structure

| File | Purpose |
| :--- | :--- |
| `index.html` | The main single-page application dashboard (Home, Transactions, Savings, Notes, etc.). |
| `fut_amount_calc.html` | The standalone Future Planner module (integrated with backend). |
| `TALYEXP.css` | Global styling, themes (Light/Dark), and responsive media queries. |
| `server.js` | Express server, MongoDB connection, Mongoose schemas, and API routes. |
| `spending.png` | App logo/favicon. |

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher) installed.
- A MongoDB Atlas account (or local MongoDB instance).

### Steps

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/talyexp.git](https://github.com/yourusername/talyexp.git)
    cd talyexp
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Database**
    Open `server.js` and locate the `MONGODB_URI` variable. Replace the connection string with your own MongoDB URI.
    ```javascript
    // server.js
    const MONGODB_URI = 'mongodb+srv://<username>:<password>@cluster.mongodb.net/talyexp...';
    ```

4.  **Run the application**
    ```bash
    node server.js
    ```
    The server typically starts on port `5000` (or the port defined in your environment).

5.  **Access the App**
    Open your browser and navigate to `http://localhost:5000`.

## 📖 Usage Guide

1.  **Getting Started**: Register a new account. The dashboard will open to the "Home" view.
2.  **Adding Data**:
    * Use the widgets on the left to add Expenses, Savings, Returns, or Payables.
    * Use the microphone icon to add entries via voice.
3.  **Recurring Items**:
    * Click **Settings** > **Add Recurring**.
    * Define the item (e.g., "Rent", Amount: 10000, Day: 5).
    * On the Home screen, these appear in the "Monthly Recurring" card. Click "Post" to officially add them to your ledger for the current month.
4.  **Future Planner**:
    * Click **🚀 Future Planner** in the navigation.
    * Enter your financial goals (Target Amount, Time, Rate, etc.).
    * Click "Calculate", review the graphs, and click "Save Plan" to store it in the database.
5.  **Reports**:
    * Use the dropdown in the header to select a month and click "Download Report".
6.  **Account Actions**:
    * **Reset App**: Clears all transactions but keeps your username/password.
    * **Delete Account**: Permanently deletes user credentials and all associated data.

## 📡 API Overview

TALYEXP uses a RESTful API structure. All endpoints return JSON.

| Resource | Endpoint | Methods | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/register`, `/api/login` | `POST` | User authentication. |
| **Account** | `/api/account/delete` | `POST` | Permanently delete user & data. |
| **Expenses** | `/api/expenses` | `GET`, `POST`, `PUT`, `DELETE` | Manage expense records. |
| **Savings** | `/api/savings` | `GET`, `POST`, `PUT`, `DELETE` | Manage savings records. |
| **Recurring** | `/api/recurring` | `GET`, `POST`, `DELETE` | Manage recurring templates. |
| **Future Plans**| `/api/futureplans` | `GET`, `POST`, `DELETE` | Manage saved investment plans. |
| **Returns** | `/api/returns` | `GET`, `POST`, `PUT`, `DELETE` | Manage money lent to others. |
| **Payables** | `/api/payables` | `GET`, `POST`, `PUT`, `DELETE` | Manage money borrowed. |
| **Notes** | `/api/notes` | `GET`, `POST`, `DELETE` | Manage user notes. |
| **Contact** | `/api/contact` | `POST` | Submit user queries. |
| **Meta** | `/api/meta`, `/api/meta/reset` | `GET`, `POST` | App metadata and data reset. |


## License & Credits

- **Developer**: PCJ (@talyexp)
- **License**: MIT License (or as specified by the repository owner).
- **Copyright**: © 2025 TALYEXP. All Rights Reserved.

---
*Note: This application is a personal project and recognized for its utility in personal finance management.*
