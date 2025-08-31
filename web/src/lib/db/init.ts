import { initializeDatabase } from './index';

// Avoid re-initializing DB on every request (Next.js dev/serverless env)
let inited = false;
let initPromise: Promise<void> | null = null;

export async function setupDatabase() {
  if (inited) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    console.log('Setting up database...');
    try {
      await initializeDatabase();
      inited = true;
      console.log('Database setup completed successfully');
    } catch (error) {
      console.error('Database setup failed:', error);
      // In production, surface the error to fail fast
      if (process.env.NODE_ENV === 'production') throw error;
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
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
