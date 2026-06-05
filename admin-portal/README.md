# Admin Portal 🛡️

A separate, secure admin dashboard running on port **3002** exclusively for administrators.

## Features

✅ **Separate Server** - Runs independently on port 3002  
✅ **Admin-Only Access** - Only `admin@lester.com` can login  
✅ **Secure Authentication** - JWT token-based authentication  
✅ **Dashboard** - View orders, customers, and statistics  
✅ **Search & Filter** - Find orders and customers quickly  
✅ **Order Management** - View detailed order information  
✅ **Customer Analytics** - Track customer spending and order history  

## Setup Instructions

### 1. Install Dependencies

The admin portal uses the same dependencies as the main server. Make sure you have them installed:

```bash
cd admin-portal
npm install
```

If dependencies are already installed in the backend folder, you can use those:

```bash
# Share dependencies from backend (optional)
npm install --save express cors helmet mongoose jsonwebtoken express-validator bcryptjs
```

### 2. Start the Admin Portal Server

```bash
node admin-server.js
```

Or if you have nodemon installed:

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════╗
║    ADMIN PORTAL SERVER STARTED             ║
║    Running on http://localhost:3002        ║
║    Only admin@lester.com can access        ║
╚════════════════════════════════════════════╝
```

### 3. Access the Admin Portal

Open your browser and go to:
```
http://localhost:3002
```

You'll be redirected to the login page.

## Login Credentials

**Email:** `admin@lester.com`  
**Password:** `admin123`

*Note: Demo credentials work in test/mock mode. For production, update credentials in MongoDB.*

## Admin Portal Routes

| Route | Purpose |
|-------|---------|
| `http://localhost:3002` | Home (redirects to login) |
| `http://localhost:3002/login` | Admin login page |
| `http://localhost:3002/dashboard` | Admin dashboard (protected) |
| `POST /api/admin/login` | Login endpoint |
| `GET /api/admin/orders` | Get all orders |
| `GET /api/admin/orders/:orderId` | Get order details |
| `GET /api/admin/customers` | Get all customers |
| `GET /api/admin/customers/:customerId` | Get customer details |

## Architecture

### Authentication Flow

1. Admin enters credentials on `/login`
2. `POST /api/admin/login` validates credentials
3. Server returns JWT token (24-hour expiry)
4. Token stored in `localStorage` as `adminToken`
5. All requests include `Authorization: Bearer <token>`
6. Token verified on server side (only admin email allowed)

### Protected Resources

All admin endpoints require:
- Valid JWT token in Authorization header
- Token email must be `admin@lester.com`

If token is invalid or admin email check fails → **403 Forbidden**

## Running Both Servers

**Terminal 1 - Main Store Server:**
```bash
cd backend
node server.js
# http://localhost:3001
```

**Terminal 2 - Admin Portal Server:**
```bash
cd admin-portal
node admin-server.js
# http://localhost:3002
```

## Database Integration

The admin portal automatically connects to the same MongoDB database as the main server:

```
mongodb+srv://lesterhamjan_db_user:HM9slILckjdHdPt0@cluster0.ksbhys7.mongodb.net/
```

If MongoDB is unavailable, it falls back to **mock data** for testing.

## Security Features

🔒 **JWT Authentication** - Secure token-based sessions  
🔒 **Admin-Only Verification** - Email check on every request  
🔒 **24-Hour Token Expiry** - Sessions expire automatically  
🔒 **CORS & Helmet** - HTTP security headers  
🔒 **Separate Port** - Isolated from main store  

## Customization

### Change Admin Email

Edit `admin-server.js`:
```javascript
const ADMIN_EMAIL = 'admin@lester.com'; // Change this
```

### Change Admin Port

Edit `admin-server.js`:
```javascript
const ADMIN_PORT = process.env.ADMIN_PORT || 3002; // Change this
```

Or set environment variable:
```bash
set ADMIN_PORT=3003
node admin-server.js
```

### Change JWT Secret

Edit `admin-server.js`:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

Or set environment variable:
```bash
set JWT_SECRET=your-super-secret-key
```

## Troubleshooting

### "Admin access denied"
- Make sure you're using `admin@lester.com` as email
- Check password is `admin123`
- Clear browser cache and try again

### "Invalid token"
- Token may have expired (24-hour limit)
- Try logging in again
- Clear localStorage: `localStorage.clear()`

### "Cannot connect to MongoDB"
- That's OK! Admin portal works with mock data
- Real data will show when MongoDB connects

### Port 3002 already in use
```bash
# Change the port in admin-server.js or use:
set ADMIN_PORT=3003
node admin-server.js
```

## Files

```
admin-portal/
├── admin-server.js      # Main server file
├── login.html          # Admin login page
├── dashboard.html      # Admin dashboard
├── package.json        # Dependencies
└── README.md          # This file
```

## Next Steps

1. ✅ Start main server on port 3001
2. ✅ Start admin portal on port 3002
3. ✅ Login at http://localhost:3002
4. ✅ Access the admin dashboard
5. ✅ View orders, customers, and analytics

---

**Admin Portal is now ready for secure admin access! 🚀**
