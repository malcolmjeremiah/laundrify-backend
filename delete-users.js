const mongoose = require('mongoose');
require('dotenv').config();

const deleteUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} users`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

deleteUsers();