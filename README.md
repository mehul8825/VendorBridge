# VendorBridge - Procurement & Vendor Management ERP

VendorBridge is a centralized, role-based ERP platform designed to streamline organization procurement workflows. It manages vendor onboarding profiles, RFQ publications, bidding comparison boards, workflow approvals, Purchase Orders, and invoice print/email actions.

## Technology Stack

- **Frontend**: React.js SPA (Vite, pure CSS layout system, Lucide icons, glassmorphism dark/light theme).
- **Backend**: Node.js & Express.js.
- **ORM & Database**: Sequelize ORM supporting both MySQL and SQLite fallbacks.
- **Emailing**: Nodemailer with Ethereal SMTP test utilities.

## Setup Instructions

### Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Seed the database with sample workflows:
   ```bash
   npm run seed
   ```
4. Start the API server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

Open **http://localhost:3000** in your browser.
