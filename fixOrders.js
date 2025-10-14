require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    // Find all orders without status
    const ordersWithoutStatus = await ordersCollection.find({ status: { $exists: false } }).toArray();
    console.log(`Found ${ordersWithoutStatus.length} orders without status`);
    
    // Update each order
    for (const order of ordersWithoutStatus) {
      let status = 'pending';
      
      if (order.deliveredAt) {
        status = 'delivered';
      } else if (order.pickedUpAt) {
        status = 'picked_up';
      } else if (order.acceptedAt || order.rider) {
        status = 'accepted';
      } else if (order.cancelledAt) {
        status = 'cancelled';
      }
      
      await ordersCollection.updateOne(
        { _id: order._id },
        { $set: { status: status } }
      );
      
      console.log(`✅ Fixed order ${order._id.toString().slice(-6)}: ${status}`);
    }
    
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });