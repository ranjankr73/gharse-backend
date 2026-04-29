# GharSe — Backend

> Quick commerce REST API for local shops. Order from nearby groceries, food joints, medical stores and more — without calling.

**Live API:** https://gharse-backend.onrender.com  
**Frontend:** https://ghar-se-food.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express.js |
| Database | MongoDB (Mongoose) |
| Cache / Sessions | Redis (ioredis) |
| Auth | JWT (access + refresh tokens) + HttpOnly cookies |
| Real-time | Socket.io |
| Scheduling | node-cron |
| Security | bcryptjs, helmet, cors |

---

## Features

### Auth System
- JWT access token (in-memory on client) + HttpOnly refresh token cookie
- Redis-backed session store — fast validation without DB hit on every request
- Token rotation on refresh, multi-device logout, session revocation
- Role-based access control — `customer`, `shopOwner`, `admin`

### Shop Management
- 5-step onboarding: basic info → profile → address → delivery settings → business details
- Admin verification gate — shops only go live after admin approves
- Soft delete, suspend/restore by admin
- Toggle open/closed status (shopOwner)

### Product & Category
- Global categories (admin) + shop subcategories (shopOwner) mapped to global
- Products with flat pricing or multiple variants (size, weight etc.)
- Stock management with low-stock threshold alerts
- Auto mark unavailable when stock hits zero

### Cart
- One cart per customer, locked to a single shop
- Price snapshot on add (billing never changes if price changes later)
- Stock validation on every add/update

### Order Lifecycle
```
PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
       ↘ CANCELLED (shop / customer / admin / system)
```
- Stock deducted on placement, restored on any cancellation
- Auto-cancel PENDING orders via cron if shop doesn't confirm within 5 minutes
- Real-time status updates to customer via Socket.io

### Reviews
- One review per delivered order
- Shop and product ratings recalculated via aggregation pipeline on every change
- Admin can hide/show reviews

---

## Project Structure

```
src/
├── config/
│   ├── database.config.js
│   ├── env.config.js
│   ├── redis.config.js
│   └── socket.config.js
├── controllers/
│   ├── auth.controller.js
│   ├── shop.controller.js
│   ├── product.controller.js
│   ├── category.controller.js
│   ├── cart.controller.js
│   ├── order.controller.js
│   └── review.controller.js
├── middlewares/
│   └── auth.middleware.js
├── models/
│   ├── user.model.js
│   ├── session.model.js
│   ├── shop.model.js
│   ├── product.model.js
│   ├── category.model.js
│   ├── subCategory.model.js
│   ├── cart.model.js
│   ├── order.model.js
│   └── review.model.js
├── routes/
│   ├── auth.route.js
│   ├── shop.route.js
│   ├── product.route.js
│   ├── category.route.js
│   ├── cart.route.js
│   ├── order.route.js
│   └── review.route.js
├── jobs/
│   └── autoCancelOrders.job.js
├── utils/
│   └── notify.js
├── scripts/
│   └── seedAdmin.js
└── app.js
index.js
```

---

## API Overview

### Auth — `/api/v1/auth`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/register` | Public | Register customer or shop owner |
| POST | `/login` | Public | Login |
| POST | `/rotate-token` | Public | Refresh access token |
| GET | `/me` | Protected | Get current user |
| POST | `/logout` | Protected | Logout current device |
| POST | `/logout-all` | Protected | Logout all devices |

### Shops — `/api/v1/shops`
| Method | Route | Access |
|--------|-------|--------|
| GET | `/public` | Public |
| GET | `/public/:shopId` | Public |
| POST | `/` | shopOwner |
| GET | `/my-shops` | shopOwner |
| PATCH | `/:shopId/profile` | shopOwner |
| PATCH | `/:shopId/address` | shopOwner |
| PATCH | `/:shopId/delivery-settings` | shopOwner |
| PATCH | `/:shopId/business-details` | shopOwner |
| PATCH | `/:shopId/toggle-status` | shopOwner |
| GET | `/admin` | admin |
| PATCH | `/admin/:shopId/verify` | admin |
| PATCH | `/admin/:shopId/toggle-active` | admin |
| DELETE | `/admin/:shopId` | admin |

### Products — `/api/v1/products`
| Method | Route | Access |
|--------|-------|--------|
| GET | `/public` | Public |
| GET | `/public/:productId` | Public |
| GET | `/public/shops/:shopId` | Public |
| GET | `/shops/:shopId` | shopOwner |
| POST | `/shops/:shopId` | shopOwner |
| PATCH | `/shops/:shopId/:productId` | shopOwner |
| PATCH | `/shops/:shopId/:productId/toggle-availability` | shopOwner |
| PATCH | `/shops/:shopId/:productId/stock` | shopOwner |
| DELETE | `/shops/:shopId/:productId` | shopOwner |
| GET | `/admin` | admin |
| PATCH | `/admin/:productId/toggle-active` | admin |

### Cart — `/api/v1/cart`
| Method | Route | Access |
|--------|-------|--------|
| GET | `/` | customer |
| POST | `/add` | customer |
| PATCH | `/items/:itemId` | customer |
| DELETE | `/items/:itemId` | customer |
| DELETE | `/` | customer |

### Orders — `/api/v1/orders`
| Method | Route | Access |
|--------|-------|--------|
| POST | `/` | customer |
| GET | `/my` | customer |
| GET | `/my/:orderId` | customer |
| POST | `/my/:orderId/cancel` | customer |
| GET | `/shop/:shopId/stats` | shopOwner |
| GET | `/shop/:shopId` | shopOwner |
| GET | `/shop/:shopId/:orderId` | shopOwner |
| PATCH | `/shop/:shopId/:orderId/status` | shopOwner |
| GET | `/admin` | admin |
| PATCH | `/admin/:orderId/cancel` | admin |

### Categories — `/api/v1/categories`
| Method | Route | Access |
|--------|-------|--------|
| GET | `/` | Public |
| GET | `/:slug` | Public |
| POST | `/` | admin |
| PATCH | `/:categoryId` | admin |
| DELETE | `/:categoryId` | admin |
| GET | `/shops/:shopId/subcategories` | Public |
| POST | `/shops/:shopId/subcategories` | shopOwner |
| PATCH | `/shops/:shopId/subcategories/:id` | shopOwner |
| DELETE | `/shops/:shopId/subcategories/:id` | shopOwner |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)
- Redis (Upstash or local)

### Installation

```bash
git clone https://github.com/ranjankr73/gharse-backend.git
cd gharse-backend
npm install
```

### Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URI=your_mongodb_connection_string

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d
```

### Run

```bash
# Development
npm run dev

# Seed first admin account
npm run seed:admin

# Production
npm start
```

---

## Environment Notes

- **Access token** — short-lived (15 min), stored in-memory on client
- **Refresh token** — long-lived (7 days), stored as HttpOnly cookie, hashed in Redis + MongoDB
- **Redis** — used for session validation on every request (no MongoDB hit per request)
- **MongoDB** — sessions stored for audit trail and device management only