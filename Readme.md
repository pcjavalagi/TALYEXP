# TALYEXP - Expense Manager

TALYEXP is a web application for tracking expenses, savings, loans (pending returns/payables), notes, and user queries. It features a clean, responsive interface and provides charts, insights, and PDF reports to streamline financial management.

## Features

- Authentication: Secure registration, login, and password reset
- Expense Tracking: Log expenses by category and date; group and analyze monthly, quarterly, yearly data
- Savings Management: Track savings by month and title
- Pending Returns & Payables: Monitor money lent and upcoming payments
- Smart Insights: Auto-generated spending and saving analysis, tips
- Notes: Private notes with full CRUD support and color-coded cards
- Contact Form: Submit feedback or queries from within the app
- PDF Export: Download reports for selected periods
- Charts: Interactive visualizations (spending, savings, cash flow, budget allocation)
- Voice Input: Add expenses/notes using voice commands (supported browsers)
- Calculator: Popup calculator for quick math
- Theme Support: Light/dark mode
- Responsive: Mobile, tablet, desktop compatibility

## Tech Stack

- **Frontend:** HTML, CSS (Inter/UI Sans theme with variables), JavaScript, Chart.js, jsPDF
- **Backend:** Node.js, Express, MongoDB (Mongoose), bcryptjs for password hashing
- **APIs:** RESTful endpoints for all entities

## File Structure

| File                    | Purpose                                     |
|-------------------------|---------------------------------------------|
| `index.html`            | Main interface and logic                    |
| `TALYEXP.css`           | App styling and themes                      |
| `server.js`             | Backend server, DB models/routes            |
| `fut_amount_calc.html`  | integrated for personal amount goal setting |   


## Installation & Setup

### Prerequisites

- Node.js v14+
- MongoDB Atlas URI (or local MongoDB)

### Steps

1. **Clone the repository**
    ```
    git clone https://github.com/yourusername/talyexp.git
    cd talyexp
    ```
2. **Install dependencies**
    ```
    npm install
    ```
3. **Configure MongoDB**
    Edit `server.js`:
    ```
    const MONGODBURI = 'YOUR_MONGODB_URI';
    ```
4. **Run the backend**
    ```
    node server.js
    ```
    The app runs at `http://localhost:5000`.

5. **Open in browser**
    Go to `http://localhost:5000`

## Usage Guide

- Register/login to start
- Add/edit/delete expenses categorized and grouped by month
- Record savings per month
- Track pending returns/payables, update on settlement
- Create, edit, delete notes with easy access
- Download expense/saving reports as PDFs
- Analyze finance trends with built-in charts
- Use the contact form for feedback
- Toggle themes and use on any device

## Customization

- Styles and themes defined in `TALYEXP.css`
- Chart format and export in `index.html`
- Backend config in `server.js`

## Security

- Passwords hashed (bcryptjs)
- Input validation on frontend/backend

## API Overview

| Resource | Endpoint                  | Methods        |
|----------|---------------------------|----------------|
| Auth     | `/api/register`, `/api/login` | POST        |
| Expenses | `/api/expenses`, `/api/expenses/:id` | GET, POST, PUT, DELETE |
| Savings  | `/api/savings`, `/api/savings/:id`   | CRUD       |
| Returns  | `/api/returns`, `/api/returns/:id`   | CRUD       |
| Payables | `/api/payables`, `/api/payables/:id` | CRUD       |
| Notes    | `/api/notes`, `/api/notes/:id`       | CRUD       |
| Income   | `/api/income`                        | CRUD       |
| Contact  | `/api/contact`                       | POST       |
| Meta     | `/api/meta`                          | GET/POST   |

## Credits

- Developed by PCJ (@talyexp)
- Icons by Tabler
- © 2025

## Liscensed application and recognised as well.

---
Feel free to reach out via the app's Contact page for feedback or feature suggestions!
