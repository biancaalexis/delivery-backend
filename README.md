# 🍔 FastBite Backend

Node.js/Express backend with MongoDB, Kafka, and WebSockets for real-time food delivery tracking.

## 📦 Installation

### Prerequisites
- Node.js v16+
- MongoDB v5+
- Apache Kafka v3.0+

### Install Dependencies

```bash
npm install
```

### Required Packages

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "socket.io": "^4.6.0",
    "kafkajs": "^2.2.4"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

## ⚙️ Configuration

Create `.env` file:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/fastbite
JWT_SECRET=your_super_secret_key_change_in_production
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=fastbite-app
FRONTEND_URL=http://localhost:3000
```

## 🚀 Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 📁 Project Structure

```
backend/
├── config/
│   ├── db.js                    # MongoDB connection
│   ├── kafka.js                 # Kafka producer/consumer
│   └── websocket.js             # Socket.IO configuration
├── middleware/
│   └── auth.js                  # JWT authentication & authorization
├── models/
│   ├── User.js                  # User schema
│   ├── Order.js                 # Order schema
│   ├── MenuItem.js              # Menu item schema
│   ├── Notification.js          # Notification schema
│   └── Rating.js                # Rating schema
├── routes/
│   ├── authRoutes.js            # POST /signup, /login
│   ├── orderRoutes.js           # Order CRUD & status updates
│   ├── menuRoutes.js            # Menu CRUD operations
│   ├── adminRoutes.js           # Admin dashboard & management
│   ├── riderRoutes.js           # Rider operations
│   ├── notificationRoutes.js    # Notification management
│   └── ratingRoutes.js          # Rating system
├── services/
│   ├── kafkaConsumer.js         # Kafka event handlers
│   ├── notificationService.js   # Notification logic
│   └── communicationService.js  # SMS/Email (mock)
├── .env                         # Environment variables
├── server.js                    # Main server file
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Menu
- `GET /api/menu` - Get all menu items
- `GET /api/menu/:id` - Get single menu item
- `POST /api/menu` - Create menu item (Admin)
- `PUT /api/menu/:id` - Update menu item (Admin)
- `DELETE /api/menu/:id` - Delete menu item (Admin)

### Orders
- `GET /api/orders` - Get orders (role-based)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order (Customer)
- `POST /api/orders/:id/accept` - Accept order (Rider)
- `POST /api/orders/:id/pickup` - Mark picked up (Rider)
- `POST /api/orders/:id/deliver` - Mark delivered (Rider)
- `POST /api/orders/:id/cancel` - Cancel order

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/orders` - All orders
- `GET /api/admin/users` - All users
- `PUT /api/admin/users/:id/status` - Toggle user status
- `POST /api/admin/announcement` - Send announcement

### Riders
- `PUT /api/riders/availability` - Toggle availability
- `POST /api/riders/location` - Update location
- `GET /api/riders/stats` - Rider statistics

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Ratings
- `POST /api/ratings` - Submit rating
- `GET /api/ratings/rider/:riderId` - Get rider ratings

## 🔐 Authentication

### JWT Token
All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

### Roles
- **Customer**: Order food, view orders
- **Rider**: Accept deliveries, update status
- **Admin**: Full system access

## 📊 Database Schema

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: 'customer' | 'rider' | 'admin',
  isActive: Boolean,
  // Rider-specific
  vehicleType: 'bike' | 'motorcycle' | 'car',
  isAvailable: Boolean,
  rating: Number,
  totalDeliveries: Number,
  earnings: Number
}
```

### Order Schema
```javascript
{
  customer: ObjectId (User),
  rider: ObjectId (User),
  items: [{ menuItem, name, qty, price }],
  pickup: { address, coordinates },
  dropoff: { address, coordinates },
  status: 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled',
  totalAmount: Number,
  deliveryFee: Number,
  notes: String,
  timestamps: { acceptedAt, pickedUpAt, deliveredAt }
}
```

### MenuItem Schema
```javascript
{
  name: String,
  description: String,
  price: Number,
  category: String,
  restaurant: String,
  image: String,
  isAvailable: Boolean,
  preparationTime: Number
}
```

## ⚡ Real-time Features

### WebSocket Events

**Client → Server:**
- `location-update` - Rider location
- `join-order-room` - Subscribe to order updates
- `leave-order-room` - Unsubscribe from order

**Server → Client:**
- `new-order-available` - New order for riders
- `order-accepted` - Order accepted by rider
- `order-picked-up` - Order picked up
- `order-delivered` - Order delivered
- `order-cancelled` - Order cancelled
- `new-notification` - New notification

### Kafka Topics
- `order-created`
- `order-accepted`
- `order-picked-up`
- `order-delivered`
- `order-cancelled`
- `menu-item-created`
- `user-registered`
- `notification-created`

## 🐛 Debugging

### Enable Detailed Logs
```javascript
// In server.js
console.log('Request:', req.method, req.path);
console.log('Body:', req.body);
```

### Test MongoDB Connection
```bash
mongosh
use fastbite
db.users.find()
```

### Test Kafka
```bash
# List topics
kafka-topics.sh --list --bootstrap-server localhost:9092

# Consume messages
kafka-console-consumer.sh --topic order-events --from-beginning --bootstrap-server localhost:9092
```

### Check Active Connections
```bash
# MongoDB
mongosh --eval "db.serverStatus().connections"

# Server
lsof -i :5000
```

## 🔒 Security Best Practices

1. **Change JWT_SECRET** in production
2. **Use HTTPS** in production
3. **Rate limiting** for API endpoints
4. **Input validation** on all routes
5. **Sanitize** user inputs
6. **Environment variables** for sensitive data

## 📈 Performance Tips

1. **Add indexes** to frequently queried fields
```javascript
userSchema.index({ email: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
```

2. **Use pagination** for large datasets
3. **Cache** frequently accessed data
4. **Optimize** database queries
5. **Monitor** server performance

## 🧪 Testing

### Manual Testing with cURL

**Sign Up:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "test123",
    "confirmPassword": "test123",
    "role": "customer"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "role": "customer"
  }'
```

**Get Menu (Public):**
```bash
curl http://localhost:5000/api/menu
```

**Create Order (Protected):**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [{"menuItemId": "...", "name": "Burger", "price": 9.99, "qty": 1}],
    "pickup": "Restaurant Address",
    "dropoff": "Customer Address"
  }'
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/fastbite
JWT_SECRET=production_secret_key_very_long_and_secure
KAFKA_BROKER=kafka.production.com:9092
FRONTEND_URL=https://fastbite.com
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/fastbite
    depends_on:
      - mongo
      - kafka
  
  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
  
  kafka:
    image: confluentinc/cp-kafka:latest
    ports:
      - "9092:9092"

volumes:
  mongo-data:
```

## 📝 Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js",
    "test": "jest",
    "lint": "eslint ."
  }
}
```

## 🆘 Support

**Common Issues:**

1. **Port in use:** Change PORT in .env
2. **MongoDB connection failed:** Check MongoDB service
3. **Kafka timeout:** Verify Kafka is running
4. **CORS errors:** Update FRONTEND_URL in .env

**Get Help:**
- Check logs in console
- Review error messages
- Verify all services are running

---

Made with ❤️ by FastBite Team