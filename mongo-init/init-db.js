// MongoDB initialization script
db = db.getSiblingDB('user_stocks_db');

// Create collections
db.createCollection('users');
db.createCollection('portfolios');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.portfolios.createIndex({ "userId": 1 });

print('✅ Database initialized successfully');
print('📊 Collections created: users, portfolios');
print('🔍 Indexes created for optimal performance');
