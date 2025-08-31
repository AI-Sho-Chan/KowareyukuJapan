import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Initialize database client
const isProd = process.env.NODE_ENV === 'production';
const dbUrl = process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL || (isProd ? '' : 'file:local.db');
if (isProd && !dbUrl) {
  // 明示的に本番での未設定を検知したい（上位で500にするため例外）
  throw new Error('TURSO_DB_URL/TURSO_DATABASE_URL が未設定です（本番環境）');
}

export const db = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize database schema
export async function initializeDatabase() {
  try {
    const baseDir = path.join(process.cwd(), 'src', 'lib', 'db');
    const devSchema = path.join(baseDir, 'schema.dev.sql');
    const schemaPath = (!isProd && fs.existsSync(devSchema)) ? devSchema : path.join(baseDir, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await db.execute(statement + ';');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Helper function to convert tags array to comma-separated string
export function tagsToString(tags: string[]): string {
  return tags.join(',');
}

// Helper function to convert comma-separated string to tags array
export function stringToTags(tagsString: string | null): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').filter(Boolean);
}

// Generate unique ID (similar to existing pattern)
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Format date for database
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

// Types for database entities
export interface DbPost {
  id: string;
  title: string | null;
  url: string | null;
  comment: string | null;
  handle: string;
  owner_key: string;
  created_at: string;
  updated_at: string;
  is_published: number;
  view_count: number;
  share_count: number;
  like_count: number;
  report_count: number;
}

export interface DbMedia {
  id: string;
  post_id: string | null;
  type: 'image' | 'video';
  url: string;
  r2_key: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: string;
}

export interface DbTag {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface DbReport {
  id: number;
  post_id: string;
  reason: string | null;
  reporter_ip: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  action_taken: string | null;
}
