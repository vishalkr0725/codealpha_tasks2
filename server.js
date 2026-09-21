import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ─────────────────────────────────────────────────
function isValidUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

async function userExists(id) {
  const { data } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
  return !!data;
}

async function postExists(id) {
  const { data } = await supabase.from('posts').select('id').eq('id', id).maybeSingle();
  return !!data;
}

// ─── USERS ───────────────────────────────────────────────────

// GET /api/users — list all users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET /api/users:', err.message);
    sendError(res, 500, 'Failed to fetch users');
  }
});

// GET /api/users/:id — get a single user with counts
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid user ID');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!user) return sendError(res, 404, 'User not found');

    // Count followers, following, posts
    const [{ count: followers }, { count: following }, { count: postCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', id),
    ]);

    res.json({
      ...user,
      followers_count: followers || 0,
      following_count: following || 0,
      posts_count: postCount || 0,
    });
  } catch (err) {
    console.error('GET /api/users/:id:', err.message);
    sendError(res, 500, 'Failed to fetch user');
  }
});

// POST /api/users — create a new user
app.post('/api/users', async (req, res) => {
  const { name, username, email, bio, profile_image } = req.body || {};

  if (!name || !username || !email) {
    return sendError(res, 400, 'Name, username, and email are required');
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return sendError(res, 400, 'Name cannot be empty');
  }
  if (typeof username !== 'string' || username.trim().length < 2) {
    return sendError(res, 400, 'Username must be at least 2 characters');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, 'Invalid email format');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        bio: bio?.trim() || '',
        profile_image: profile_image?.trim() || '',
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return sendError(res, 409, 'Username or email already exists');
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/users:', err.message);
    sendError(res, 500, 'Failed to create user');
  }
});

// GET /api/users/:id/posts — get a user's posts
app.get('/api/users/:id/posts', async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid user ID');

  try {
    if (!(await userExists(id))) return sendError(res, 404, 'User not found');

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('USER POSTS DATABASE ERROR:', postsError);
      return sendError(res, 500, postsError.message);
    }

    const safePosts = posts || [];

    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (authorError) {
      console.error('USER POSTS AUTHOR ERROR:', authorError);
      return sendError(res, 500, authorError.message);
    }

    const enriched = [];

    for (const post of safePosts) {
      const { count: likeCount, error: likeError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (likeError) {
        console.error('USER POSTS LIKE COUNT ERROR:', likeError);
        return sendError(res, 500, likeError.message);
      }

      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id')
        .eq('post_id', post.id);

      if (commentsError) {
        console.error('USER POSTS COMMENT COUNT ERROR:', commentsError);
        return sendError(res, 500, commentsError.message);
      }

      enriched.push({
        ...post,
        user: author || null,
        like_count: likeCount || 0,
        comment_count: comments?.length || 0,
      });
    }

    return res.json(enriched);
  } catch (err) {
    console.error('GET /api/users/:id/posts:', err.message);
    return sendError(res, 500, 'Failed to fetch user posts');
  }
});

// ─── POSTS ───────────────────────────────────────────────────

// GET /api/posts — get all posts (feed)
app.get('/api/posts', async (req, res) => {
  try {
    const currentUserId = req.query.user_id || null;

    if (currentUserId && !isValidUUID(currentUserId)) {
      return sendError(res, 400, 'Invalid user ID');
    }

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('POSTS DATABASE ERROR:', postsError);
      return sendError(res, 500, postsError.message);
    }

    const safePosts = posts || [];

    const userIds = [...new Set(safePosts.map((post) => post.user_id).filter(Boolean))];

    let users = [];
    if (userIds.length > 0) {
      const { data, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) {
        console.error('POST AUTHORS DATABASE ERROR:', usersError);
        return sendError(res, 500, usersError.message);
      }
      users = data || [];
    }

    const userMap = new Map(users.map((user) => [user.id, user]));

    const enriched = [];

    for (const post of safePosts) {
      const { count: likeCount, error: likeError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (likeError) {
        console.error('LIKE COUNT ERROR:', likeError);
        return sendError(res, 500, likeError.message);
      }

      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id')
        .eq('post_id', post.id);

      if (commentsError) {
        console.error('COMMENT COUNT ERROR:', commentsError);
        return sendError(res, 500, commentsError.message);
      }

      let likedByCurrentUser = false;

      if (currentUserId) {
        const { data: userLike, error: userLikeError } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (userLikeError) {
          console.error('USER LIKE ERROR:', userLikeError);
          return sendError(res, 500, userLikeError.message);
        }

        likedByCurrentUser = !!userLike;
      }

      enriched.push({
        ...post,
        user: userMap.get(post.user_id) || null,
        like_count: likeCount || 0,
        comment_count: comments?.length || 0,
        liked_by_current_user: likedByCurrentUser,
      });
    }

    return res.json(enriched);
  } catch (error) {
    console.error('GET /api/posts FATAL ERROR:', error);
    return sendError(res, 500, error.message || 'Failed to fetch posts');
  }
});

// POST /api/posts — create a new post
app.post('/api/posts', async (req, res) => {
  const { user_id, content, image } = req.body || {};

  if (!user_id) return sendError(res, 400, 'user_id is required');
  if (!isValidUUID(user_id)) return sendError(res, 400, 'Invalid user ID');
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return sendError(res, 400, 'Post content cannot be empty');
  }
  if (content.length > 5000) return sendError(res, 400, 'Post content is too long (max 5000 characters)');

  try {
    if (!(await userExists(user_id))) return sendError(res, 404, 'User not found');

    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id,
        content: content.trim(),
        image: image?.trim() || null,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('POST /api/posts INSERT ERROR:', insertError);
      return sendError(res, 500, insertError.message);
    }

    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    if (authorError) {
      console.error('POST /api/posts AUTHOR ERROR:', authorError);
      return sendError(res, 500, authorError.message);
    }

    res.status(201).json({ ...post, user: author || null, like_count: 0, comment_count: 0, liked_by_current_user: false });
  } catch (err) {
    console.error('POST /api/posts:', err.message);
    sendError(res, 500, 'Failed to create post');
  }
});

// DELETE /api/posts/:id — delete a post
app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid post ID');

  try {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('DELETE /api/posts/:id:', err.message);
    sendError(res, 500, 'Failed to delete post');
  }
});

// ─── COMMENTS ────────────────────────────────────────────────

// GET /api/posts/:id/comments — get comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid post ID');

  try {
    if (!(await postExists(id))) return sendError(res, 404, 'Post not found');

    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('COMMENTS DATABASE ERROR:', commentsError);
      return sendError(res, 500, commentsError.message);
    }

    const safeComments = comments || [];

    const userIds = [...new Set(safeComments.map((c) => c.user_id).filter(Boolean))];

    let users = [];
    if (userIds.length > 0) {
      const { data, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) {
        console.error('COMMENT AUTHORS DATABASE ERROR:', usersError);
        return sendError(res, 500, usersError.message);
      }
      users = data || [];
    }

    const userMap = new Map(users.map((user) => [user.id, user]));

    const enriched = safeComments.map((comment) => ({
      ...comment,
      user: userMap.get(comment.user_id) || null,
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('GET /api/posts/:id/comments:', err.message);
    return sendError(res, 500, 'Failed to fetch comments');
  }
});

// POST /api/posts/:id/comments — add a comment
app.post('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { user_id, content } = req.body || {};

  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid post ID');
  if (!user_id || !isValidUUID(user_id)) return sendError(res, 400, 'Valid user_id is required');
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return sendError(res, 400, 'Comment content cannot be empty');
  }
  if (content.length > 2000) return sendError(res, 400, 'Comment is too long (max 2000 characters)');

  try {
    if (!(await postExists(id))) return sendError(res, 404, 'Post not found');
    if (!(await userExists(user_id))) return sendError(res, 404, 'User not found');

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({ post_id: id, user_id, content: content.trim() })
      .select('*')
      .single();

    if (insertError) {
      console.error('POST /api/posts/:id/comments INSERT ERROR:', insertError);
      return sendError(res, 500, insertError.message);
    }

    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    if (authorError) {
      console.error('POST /api/posts/:id/comments AUTHOR ERROR:', authorError);
      return sendError(res, 500, authorError.message);
    }

    res.status(201).json({ ...comment, user: author || null });
  } catch (err) {
    console.error('POST /api/posts/:id/comments:', err.message);
    sendError(res, 500, 'Failed to create comment');
  }
});

// ─── LIKES ───────────────────────────────────────────────────

// POST /api/posts/:id/like — like a post
app.post('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body || {};

  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid post ID');
  if (!user_id || !isValidUUID(user_id)) return sendError(res, 400, 'Valid user_id is required');

  try {
    if (!(await postExists(id))) return sendError(res, 404, 'Post not found');
    if (!(await userExists(user_id))) return sendError(res, 404, 'User not found');

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) return sendError(res, 409, 'Already liked');

    const { error } = await supabase.from('likes').insert({ post_id: id, user_id });
    if (error) {
      if (error.code === '23505') return sendError(res, 409, 'Already liked');
      throw error;
    }

    // Return new like count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    res.status(201).json({ success: true, like_count: count || 0, liked: true });
  } catch (err) {
    console.error('POST /api/posts/:id/like:', err.message);
    sendError(res, 500, 'Failed to like post');
  }
});

// DELETE /api/posts/:id/like — unlike a post
app.delete('/api/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body || {};

  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid post ID');
  if (!user_id || !isValidUUID(user_id)) return sendError(res, 400, 'Valid user_id is required');

  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', id)
      .eq('user_id', user_id);
    if (error) throw error;

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    res.json({ success: true, like_count: count || 0, liked: false });
  } catch (err) {
    console.error('DELETE /api/posts/:id/like:', err.message);
    sendError(res, 500, 'Failed to unlike post');
  }
});

// ─── FOLLOWS ─────────────────────────────────────────────────

// POST /api/users/:id/follow — follow a user
app.post('/api/users/:id/follow', async (req, res) => {
  const { id } = req.params;
  const { follower_id } = req.body || {};

  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid user ID');
  if (!follower_id || !isValidUUID(follower_id)) return sendError(res, 400, 'Valid follower_id is required');
  if (id === follower_id) return sendError(res, 400, 'Cannot follow yourself');

  try {
    if (!(await userExists(id))) return sendError(res, 404, 'User not found');
    if (!(await userExists(follower_id))) return sendError(res, 404, 'Follower not found');

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', follower_id)
      .eq('following_id', id)
      .maybeSingle();

    if (existing) return sendError(res, 409, 'Already following');

    const { error } = await supabase.from('follows').insert({ follower_id, following_id: id });
    if (error) {
      if (error.code === '23505') return sendError(res, 409, 'Already following');
      throw error;
    }

    // Return new follower count
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id);

    res.status(201).json({ success: true, followers_count: count || 0, following: true });
  } catch (err) {
    console.error('POST /api/users/:id/follow:', err.message);
    sendError(res, 500, 'Failed to follow user');
  }
});

// DELETE /api/users/:id/follow — unfollow a user
app.delete('/api/users/:id/follow', async (req, res) => {
  const { id } = req.params;
  const { follower_id } = req.body || {};

  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid user ID');
  if (!follower_id || !isValidUUID(follower_id)) return sendError(res, 400, 'Valid follower_id is required');

  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', follower_id)
      .eq('following_id', id);
    if (error) throw error;

    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id);

    res.json({ success: true, followers_count: count || 0, following: false });
  } catch (err) {
    console.error('DELETE /api/users/:id/follow:', err.message);
    sendError(res, 500, 'Failed to unfollow user');
  }
});

// GET /api/users/:id/following — check if current user follows target
app.get('/api/users/:id/following', async (req, res) => {
  const { id } = req.params;
  const followerId = req.query.follower_id;

  if (!isValidUUID(id)) return sendError(res, 400, 'Invalid user ID');
  if (!followerId || !isValidUUID(followerId)) return sendError(res, 400, 'Valid follower_id query param is required');

  try {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', id)
      .maybeSingle();

    res.json({ following: !!data });
  } catch (err) {
    console.error('GET /api/users/:id/following:', err.message);
    sendError(res, 500, 'Failed to check follow status');
  }
});

// ─── Serve frontend ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  sendError(res, 500, 'Internal server error');
});

// ─── Start (local) / Export (Vercel) ────────────────────────
// Export the app for serverless platforms (Vercel, etc.)
export default app;

// When running locally, start the HTTP server.
// On Vercel, the platform handles the server lifecycle.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  Commons — Social Media Platform`);
    console.log(`  Server running at http://localhost:${PORT}`);
    console.log(`  API base: http://localhost:${PORT}/api\n`);
  });
}
