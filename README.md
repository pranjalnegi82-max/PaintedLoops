# 🌸 PaintedLoops — Backend API

Node.js + Express + MySQL backend for the PaintedLoops e-commerce store.

---

## 🚀 Setup Instructions

### 1. Install Node.js
Download from https://nodejs.org (version 18 or above)

### 2. Install MySQL
Download from https://dev.mysql.com/downloads/installer/
- Remember your MySQL root password during setup

### 3. Clone / Extract this folder
```
paintedloops-backend/
```

### 4. Install dependencies
```bash
npm install
```

### 5. Setup the database
Open MySQL Workbench or MySQL terminal and run:
```bash
mysql -u root -p < paintedloops-railway.sql
```

### 6. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your values:
- `DB_PASSWORD` → your MySQL password
- `JWT_SECRET`  → any long random string
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` → from razorpay.com dashboard
- `EMAIL_USER` & `EMAIL_PASS` → your Gmail + App Password

### 7. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

Server runs at: **https://paintedloops-backend.onrender.com**

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get profile (🔒) |
| PUT  | /api/auth/update-profile | Update profile (🔒) |
| PUT  | /api/auth/change-password | Change password (🔒) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/products | List all products |
| GET  | /api/products?category=hair-accessories | Filter by category |
| GET  | /api/products?search=daisy | Search products |
| GET  | /api/products/:slug | Get single product |
| POST | /api/products | Create product (🔒 Admin) |
| PUT  | /api/products/:id | Update product (🔒 Admin) |
| DELETE | /api/products/:id | Delete product (🔒 Admin) |
| POST | /api/products/:id/review | Add review (🔒) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders | Place order (🔒) |
| GET  | /api/orders | My orders (🔒) |
| GET  | /api/orders/:id | Order details (🔒) |
| GET  | /api/orders/admin/all | All orders (🔒 Admin) |
| PUT  | /api/orders/:id/status | Update status (🔒 Admin) |

### Payment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payment/create-order | Create Razorpay order (🔒) |
| POST | /api/payment/verify | Verify payment (🔒) |
| POST | /api/payment/cod-confirm | Confirm COD (🔒) |

### Addresses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/addresses | Get my addresses (🔒) |
| POST | /api/addresses | Add address (🔒) |
| PUT  | /api/addresses/:id | Update address (🔒) |
| DELETE | /api/addresses/:id | Delete address (🔒) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Stats & analytics (🔒 Admin) |
| GET | /api/admin/users | All users (🔒 Admin) |

> 🔒 = Requires `Authorization: Bearer <token>` header

---

## 🧪 Test with Postman
1. Download Postman: https://www.postman.com
2. Register → Login → Copy the `token` from response
3. Add header: `Authorization: Bearer YOUR_TOKEN`

---

## 💳 Razorpay Setup
1. Sign up at https://razorpay.com
2. Go to Settings → API Keys → Generate Key
3. Add Key ID and Key Secret to `.env`

---

## 📧 Gmail Setup for Emails
1. Enable 2-Factor Authentication on Gmail
2. Go to Google Account → Security → App Passwords
3. Generate an App Password and add to `.env`

---

## 🗂️ Project Structure
```
paintedloops-backend/
├── server.js           ← Entry point
├── paintedloops-railway.sql        ← MySQL schema + seed data
├── .env.example        ← Environment template
├── config/
│   └── db.js           ← MySQL connection
├── controllers/
│   ├── authController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── addressController.js
│   └── adminController.js
├── middleware/
│   └── auth.js         ← JWT protection
├── routes/
│   ├── auth.js
│   ├── products.js
│   └── index.js
└── utils/
    └── mailer.js       ← Email sender
```

---

Made with ❤️ for PaintedLoops

## Checkout contract and deployment

1. Create a store order with `address_id`, `payment_method`, and product IDs/quantities.
2. For online payment, call `/api/payment/create-order` with the returned store `order_id`. The API calculates the amount from the database; a client-supplied amount is not accepted.
3. Use the returned Razorpay order in Checkout, then send the store order ID and Razorpay response to `/api/payment/verify`. Only captured payments with matching amounts are accepted; enable automatic capture in the payment account.
4. For COD, call `/api/payment/cod-confirm` with the store order ID.

Existing storefronts must adopt step 2 before deploying this API change. Paid-order cancellation requires shop review; automatic refunds are not implemented. Stock is reserved when an order is created; abandoned-order expiry and payment webhooks remain follow-up work.

For an existing database, back it up and apply `migrations/001_review_fields.sql` once, checking for existing columns first. Do not import the seed SQL over a live store. No existing prices or product images are changed by this migration.

Product images accept HTTPS URLs or `/uploads/` paths. Bundled photos are served from the backend's `/uploads/images/` directory. A separately hosted storefront must resolve relative image paths against the API origin. Persistent storage is required for newly uploaded images; no upload endpoint currently exists.

Run `npm test` for regression checks. Database and payment integration still require a staging database and Razorpay test credentials.

The seed SQL does not create an administrator. Register an account, then promote that verified account using a private database administration session. Never publish administrator credentials.
