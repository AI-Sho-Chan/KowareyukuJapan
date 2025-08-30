import { db, DbPost, DbMedia, generateId, formatDate } from './index';
import type { StoredPost } from '../store';

export class PostsRepository {
  // Create a new post
  async createPost(data: {
    title?: string;
    url?: string;
    comment?: string;
    handle?: string;
    ownerKey: string;
    tags?: string[];
    media?: { type: 'image' | 'video'; url: string };
  }): Promise<StoredPost> {
    console.log('=== PostsRepository.createPost START ===');
    console.log('Input data:', data);
    
    const id = generateId();
    const now = formatDate();
    
    console.log('Generated ID:', id);
    console.log('Timestamp:', now);
    
    // Begin transaction
    const batch = [];
    
    // Insert post
    const postInsertQuery = `INSERT INTO posts (id, title, url, comment, handle, owner_key, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const postInsertArgs = [id, data.title || null, data.url || null, data.comment || null, 
               data.handle || '@guest', data.ownerKey, now, now];
    
    console.log('Post insert query:', postInsertQuery);
    console.log('Post insert args:', postInsertArgs);
    
    batch.push(
      db.execute({
        sql: postInsertQuery,
        args: postInsertArgs
      })
    );
    
    // Insert tags if provided
    if (data.tags && data.tags.length > 0) {
      console.log('Processing tags:', data.tags);
      for (const tagName of data.tags) {
        const tagQuery = `INSERT INTO post_tags (post_id, tag_id)
                  SELECT ?, id FROM tags WHERE name = ?`;
        const tagArgs = [id, tagName];
        
        console.log('Tag query:', tagQuery);
        console.log('Tag args:', tagArgs);
        
        batch.push(
          db.execute({
            sql: tagQuery,
            args: tagArgs
          })
        );
      }
    }
    
    // Insert media if provided
    if (data.media) {
      console.log('Processing media:', data.media);
      const mediaId = generateId();
      const mediaQuery = `INSERT INTO media (id, post_id, type, url, created_at)
                VALUES (?, ?, ?, ?, ?)`;
      const mediaArgs = [mediaId, id, data.media.type, data.media.url, now];
      
      console.log('Media query:', mediaQuery);
      console.log('Media args:', mediaArgs);
      
      batch.push(
        db.execute({
          sql: mediaQuery,
          args: mediaArgs
        })
      );
    }
    
    console.log('Executing batch of', batch.length, 'queries...');
    
    // Execute all queries
    await Promise.all(batch);
    
    console.log('All queries executed successfully');
    
    // Return the created post
    const result = {
      id,
      title: data.title || '',
      url: data.url,
      comment: data.comment,
      handle: data.handle,
      ownerKey: data.ownerKey,
      tags: data.tags,
      media: data.media,
      createdAt: now
    };
    
    console.log('Returning post:', result);
    console.log('=== PostsRepository.createPost END ===');
    
    return result;
  }
  
  // Get all posts (with pagination)
  async getAllPosts(options: {
    limit?: number;
    offset?: number;
    includeUnpublished?: boolean;
  } = {}): Promise<StoredPost[]> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    const whereClause = options.includeUnpublished ? '' : 'WHERE p.is_published = 1';
    
    const result = await db.execute({
      sql: `
        SELECT 
          p.*,
          m.type as media_type,
          m.url as media_url,
          GROUP_CONCAT(t.name) as tags
        FROM posts p
        LEFT JOIN media m ON m.post_id = p.id
        LEFT JOIN post_tags pt ON pt.post_id = p.id
        LEFT JOIN tags t ON t.id = pt.tag_id
        ${whereClause}
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset]
    });
    
    return result.rows.map(row => this.rowToStoredPost(row as any));
  }
  
  // Get posts count
  async getPostsCount(includeHidden?: boolean): Promise<number> {
    const hiddenFilter = includeHidden ? '' : 'WHERE is_published = 1';
    
    const result = await db.execute({
      sql: `SELECT COUNT(*) as count FROM posts ${hiddenFilter}`,
      args: []
    });
    
    const row = result.rows[0] as any;
    return Number(row?.count || 0);
  }

  // Get post by ID
  async getPost(id: string): Promise<StoredPost | null> {
    const result = await db.execute({
      sql: `
        SELECT 
          p.*,
          m.type as media_type,
          m.url as media_url,
          GROUP_CONCAT(t.name) as tags
        FROM posts p
        LEFT JOIN media m ON m.post_id = p.id
        LEFT JOIN post_tags pt ON pt.post_id = p.id
        LEFT JOIN tags t ON t.id = pt.tag_id
        WHERE p.id = ?
        GROUP BY p.id
      `,
      args: [id]
    });
    
    if (result.rows.length === 0) return null;
    return this.rowToStoredPost(result.rows[0] as any);
  }
  
  // Update post
  async updatePost(id: string, updates: {
    title?: string;
    comment?: string;
    tags?: string[];
    isPublished?: boolean;
    handle?: string;
  }): Promise<boolean> {
    const updateFields = [];
    const args: any[] = [];
    
    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      args.push(updates.title);
    }
    
    if (updates.comment !== undefined) {
      updateFields.push('comment = ?');
      args.push(updates.comment);
    }
    
    if (updates.isPublished !== undefined) {
      updateFields.push('is_published = ?');
      args.push(updates.isPublished ? 1 : 0);
    }

    if (updates.handle !== undefined) {
      updateFields.push('handle = ?');
      args.push(updates.handle);
    }
    
    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      args.push(formatDate());
      args.push(id);
      
      await db.execute({
        sql: `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`,
        args
      });
    }
    
    // Update tags if provided
    if (updates.tags) {
      // Remove existing tags
      await db.execute({
        sql: 'DELETE FROM post_tags WHERE post_id = ?',
        args: [id]
      });
      
      // Add new tags
      for (const tagName of updates.tags) {
        await db.execute({
          sql: `INSERT INTO post_tags (post_id, tag_id)
                SELECT ?, id FROM tags WHERE name = ?`,
          args: [id, tagName]
        });
      }
    }
    
    return true;
  }
  
  // Delete post
  async deletePost(id: string): Promise<boolean> {
    const result = await db.execute({
      sql: 'DELETE FROM posts WHERE id = ?',
      args: [id]
    });
    
    return (result.rowsAffected || 0) > 0;
  }
  
  // Search posts
  async searchPosts(query: string, tags?: string[]): Promise<StoredPost[]> {
    let sql = `
      SELECT 
        p.*,
        m.type as media_type,
        m.url as media_url,
        GROUP_CONCAT(t.name) as tags
      FROM posts p
      LEFT JOIN media m ON m.post_id = p.id
      LEFT JOIN post_tags pt ON pt.post_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
      WHERE p.is_published = 1
    `;
    
    const args: any[] = [];
    
    if (query) {
      sql += ` AND (p.title LIKE ? OR p.comment LIKE ? OR p.url LIKE ?)`;
      const searchPattern = `%${query}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }
    
    if (tags && tags.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM post_tags pt2 
        JOIN tags t2 ON t2.id = pt2.tag_id 
        WHERE pt2.post_id = p.id AND t2.name IN (${tags.map(() => '?').join(',')})
      )`;
      args.push(...tags);
    }
    
    sql += ` GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100`;
    
    const result = await db.execute({ sql, args });
    return result.rows.map(row => this.rowToStoredPost(row as any));
  }
  
  // Report a post
  async reportPost(postId: string, reason?: string, reporterIp?: string): Promise<void> {
    await db.execute({
      sql: `INSERT INTO reports (post_id, reason, reporter_ip, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [postId, reason || null, reporterIp || null, formatDate()]
    });
    
    // Update report count
    await db.execute({
      sql: `UPDATE posts SET report_count = report_count + 1 WHERE id = ?`,
      args: [postId]
    });
    
    // Auto-hide if report threshold reached
    const result = await db.execute({
      sql: `SELECT report_count FROM posts WHERE id = ?`,
      args: [postId]
    });
    
    if (result.rows.length > 0) {
      const reportCount = (result.rows[0] as any).report_count;
      if (reportCount >= 3) { // Auto-hide after 3 reports
        await db.execute({
          sql: `UPDATE posts SET is_published = 0 WHERE id = ?`,
          args: [postId]
        });
      }
    }
  }
  
  // Helper function to convert database row to StoredPost
  private rowToStoredPost(row: any): StoredPost {
    return {
      id: row.id,
      title: row.title || '',
      url: row.url || undefined,
      comment: row.comment || undefined,
      handle: row.handle || '@guest',
      ownerKey: row.owner_key,
      tags: row.tags ? row.tags.split(',') : undefined,
      media: row.media_url ? {
        type: row.media_type as 'image' | 'video',
        url: row.media_url
      } : undefined,
      createdAt: row.created_at
    };
  }
}
