import { initializeDatabase } from './index';

// Initialize database on server startup
export async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    await initializeDatabase();
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    // In production, you might want to handle this differently
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}