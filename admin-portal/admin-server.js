const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const ADMIN_PORT = process.env.ADMIN_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = 'mongodb+srv://lesterhamjan_db_user:HM9slILckjdHdPt0@cluster0.ksbhys7.mongodb.net/';
const ADMIN_EMAIL = 'admin@lester.com';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Database setup
let mongodbConnected = false;
const mockUsers = [];

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('[Admin Portal] Connected to MongoDB');
  mongodbConnected = true;
})
.catch(err => {
  console.error('[Admin Portal] Error connecting to MongoDB:', err.message);
  console.log('[Admin Portal] Using mock data instead...');
  mongodbConnected = false;
});

// Mongoose schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  shipping_address: String,
  created_at: { type: Date, default: Date.now }
});

const orderItemSchema = new mongoose.Schema({
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  stock: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const OrderItem = mongoose.model('OrderItem', orderItemSchema);
const Product = mongoose.model('Product', productSchema);

// Admin authentication middleware
const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    if (user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  });
};

// Routes

// Root - redirect to login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Admin login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Admin dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Admin login endpoint
app.post('/api/admin/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Only allow admin email
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access denied' });
    }

    let user;

    if (mongodbConnected) {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Admin account not found' });
      }

      const bcrypt = require('bcryptjs');
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      // Mock admin login
      if (password !== 'admin123') {
        return res.status(401).json({ error: 'Invalid password' });
      }
      user = { _id: 'admin-001', name: 'Admin', email: ADMIN_EMAIL };
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all orders with customer details
app.get('/api/admin/orders', adminAuthMiddleware, async (req, res) => {
  try {
    let orders = [];
    
    if (mongodbConnected) {
      orders = await Order.find()
        .populate('user_id', 'name email')
        .sort({ created_at: -1 });
    } else {
      // Return mock data
      orders = [
        {
          _id: 'mock-order-001',
          user_id: { _id: 'user1', name: 'John Customer', email: 'john@example.com' },
          total: 299.97,
          status: 'completed',
          shipping_address: '123 Main St, City, State 12345',
          created_at: new Date(Date.now() - 86400000 * 5)
        },
        {
          _id: 'mock-order-002',
          user_id: { _id: 'user1', name: 'John Customer', email: 'john@example.com' },
          total: 149.99,
          status: 'pending',
          shipping_address: '456 Oak Ave, Town, State 67890',
          created_at: new Date(Date.now() - 86400000 * 2)
        }
      ];
    }
    
    console.log('[Admin] Orders fetched:', orders.length);
    res.json(orders);
  } catch (error) {
    console.error('[Admin] Error fetching orders:', error.message);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Admin: Get order details
app.get('/api/admin/orders/:orderId', adminAuthMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    let order = null;
    let orderItems = [];
    
    if (mongodbConnected) {
      order = await Order.findById(orderId)
        .populate('user_id', 'name email');
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      orderItems = await OrderItem.find({ order_id: orderId })
        .populate('product_id', 'name price image');
    } else {
      // Mock data
      if (orderId === 'mock-order-001') {
        order = {
          _id: 'mock-order-001',
          user_id: { _id: 'user1', name: 'John Customer', email: 'john@example.com' },
          total: 299.97,
          status: 'completed',
          shipping_address: '123 Main St, City, State 12345',
          created_at: new Date(Date.now() - 86400000 * 5)
        };
        orderItems = [
          {
            _id: 'item1',
            product_id: { _id: 'prod1', name: 'Wireless Headphones', price: 99.99 },
            quantity: 2,
            price: 99.99
          },
          {
            _id: 'item2',
            product_id: { _id: 'prod2', name: 'Gaming Mouse', price: 49.99 },
            quantity: 1,
            price: 99.99
          }
        ];
      } else if (orderId === 'mock-order-002') {
        order = {
          _id: 'mock-order-002',
          user_id: { _id: 'user1', name: 'John Customer', email: 'john@example.com' },
          total: 149.99,
          status: 'pending',
          shipping_address: '456 Oak Ave, Town, State 67890',
          created_at: new Date(Date.now() - 86400000 * 2)
        };
        orderItems = [
          {
            _id: 'item3',
            product_id: { _id: 'prod3', name: 'Smart Watch', price: 199.99 },
            quantity: 1,
            price: 149.99
          }
        ];
      }
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log('[Admin] Order details fetched:', orderId);
    res.json({
      ...order.toObject ? order.toObject() : order,
      items: orderItems
    });
  } catch (error) {
    console.error('[Admin] Error fetching order:', error.message);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Admin: Get all customers
app.get('/api/admin/customers', adminAuthMiddleware, async (req, res) => {
  try {
    let customers = [];
    
    if (mongodbConnected) {
      customers = await User.find().select('name email created_at -password').sort({ created_at: -1 });
      
      const customersWithOrders = await Promise.all(
        customers.map(async (customer) => {
          const orderCount = await Order.countDocuments({ user_id: customer._id });
          const totalSpent = await Order.aggregate([
            { $match: { user_id: customer._id } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ]);
          
          return {
            ...customer.toObject(),
            orderCount,
            totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
          };
        })
      );
      customers = customersWithOrders;
    } else {
      customers = [
        {
          _id: 'user1',
          name: 'John Customer',
          email: 'john@example.com',
          created_at: new Date(Date.now() - 86400000 * 30),
          orderCount: 2,
          totalSpent: 449.96
        },
        {
          _id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          created_at: new Date(Date.now() - 86400000 * 15),
          orderCount: 1,
          totalSpent: 99.99
        }
      ];
    }
    
    console.log('[Admin] Customers fetched:', customers.length);
    res.json(customers);
  } catch (error) {
    console.error('[Admin] Error fetching customers:', error.message);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Admin: Get customer details
app.get('/api/admin/customers/:customerId', adminAuthMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    let customer = null;
    let orders = [];
    
    if (mongodbConnected) {
      customer = await User.findById(customerId).select('-password');
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      orders = await Order.find({ user_id: customerId }).sort({ created_at: -1 });
    } else {
      if (customerId === 'user1') {
        customer = {
          _id: 'user1',
          name: 'John Customer',
          email: 'john@example.com',
          created_at: new Date(Date.now() - 86400000 * 30)
        };
        orders = [
          {
            _id: 'mock-order-001',
            total: 299.97,
            status: 'completed',
            created_at: new Date(Date.now() - 86400000 * 5)
          },
          {
            _id: 'mock-order-002',
            total: 149.99,
            status: 'pending',
            created_at: new Date(Date.now() - 86400000 * 2)
          }
        ];
      } else if (customerId === 'user2') {
        customer = {
          _id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          created_at: new Date(Date.now() - 86400000 * 15)
        };
        orders = [
          {
            _id: 'mock-order-003',
            total: 99.99,
            status: 'completed',
            created_at: new Date(Date.now() - 86400000 * 10)
          }
        ];
      }
    }

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('[Admin] Customer details fetched:', customerId);
    res.json({
      ...customer.toObject ? customer.toObject() : customer,
      orders
    });
  } catch (error) {
    console.error('[Admin] Error fetching customer:', error.message);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Admin] Error:', err.message);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(ADMIN_PORT, () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║    ADMIN PORTAL SERVER STARTED             ║`);
  console.log(`║    Running on http://localhost:${ADMIN_PORT}     ║`);
  console.log(`║    Only admin@lester.com can access        ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('[Admin Portal] Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('[Admin Portal] Error closing connection:', error);
    process.exit(1);
  }
});
