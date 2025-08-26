import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function migrateLocalToTurso() {
  console.log('Starting data migration from local.db to Turso...');
  
  // Connect to local database
  const localDb = createClient({
    url: 'file:' + path.join(__dirname, '../../local.db'),
  });

  // Connect to Turso database  
  const tursoDb = createClient({
    url: process.env.TURSO_DB_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  });

  try {
    // Migrate posts
    console.log('\n📋 Migrating posts...');
    const localPosts = await localDb.execute('SELECT * FROM posts');
    console.log(`Found ${localPosts.rows.length} posts in local database`);
    
    for (const post of localPosts.rows) {
      try {
        await tursoDb.execute({
          sql: `INSERT OR REPLACE INTO posts (id, owner_key, url, comment, tags, media_type, media_data, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            post.id,
            post.owner_key,
            post.url,
            post.comment,
            post.tags,
            post.media_type,
            post.media_data,
            post.metadata_json,
            post.created_at,
            post.updated_at
          ]
        });
        console.log(`✅ Migrated post: ${post.id}`);
      } catch (error) {
        console.log(`⚠️ Skipping post ${post.id}: Already exists or invalid data`);
      }
    }

    // Migrate comments
    console.log('\n💬 Migrating comments...');
    const localComments = await localDb.execute('SELECT * FROM comments');
    console.log(`Found ${localComments.rows.length} comments in local database`);
    
    for (const comment of localComments.rows) {
      try {
        await tursoDb.execute({
          sql: `INSERT OR REPLACE INTO comments (id, post_id, author_name, author_key, content, ip_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            comment.id,
            comment.post_id,
            comment.author_name,
            comment.author_key,
            comment.content,
            comment.ip_hash,
            comment.created_at,
            comment.updated_at
          ]
        });
        console.log(`✅ Migrated comment: ${comment.id}`);
      } catch (error) {
        console.log(`⚠️ Skipping comment ${comment.id}: Already exists or invalid data`);
      }
    }

    // Migrate audit logs
    console.log('\n📝 Migrating audit logs...');
    const localAuditLogs = await localDb.execute('SELECT * FROM audit_logs LIMIT 1000');
    console.log(`Found ${localAuditLogs.rows.length} audit logs in local database (max 1000)`);
    
    for (const log of localAuditLogs.rows) {
      try {
        await tursoDb.execute({
          sql: `INSERT OR REPLACE INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            log.id,
            log.user_id,
            log.action,
            log.resource_type,
            log.resource_id,
            log.ip_address,
            log.user_agent,
            log.metadata_json,
            log.created_at
          ]
        });
      } catch (error) {
        // Silently skip audit logs
      }
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const tursoPostCount = await tursoDb.execute('SELECT COUNT(*) as count FROM posts');
    const tursoCommentCount = await tursoDb.execute('SELECT COUNT(*) as count FROM comments');
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Posts in Turso: ${tursoPostCount.rows[0].count}`);
    console.log(`   Comments in Turso: ${tursoCommentCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateLocalToTurso()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default migrateLocalToTurso;