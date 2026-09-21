-- ============================================================
-- Social Media Platform - Database Schema
-- ============================================================
-- This file documents the database schema used by the
-- Express.js backend. The actual tables are created in
-- Supabase (PostgreSQL) and the Express server connects
-- to them via the @supabase/supabase-js client.
--
-- Tables: users, posts, comments, likes, follows
-- ============================================================

-- 1. USERS
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  username      text NOT NULL UNIQUE,
  email         text NOT NULL UNIQUE,
  bio           text NOT NULL DEFAULT '',
  profile_image text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. POSTS
CREATE TABLE posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  image      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. COMMENTS
CREATE TABLE comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. LIKES
CREATE TABLE likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5. FOLLOWS
CREATE TABLE follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Indexes for performance
CREATE INDEX idx_posts_created_at  ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id     ON posts(user_id);
CREATE INDEX idx_comments_post_id  ON comments(post_id, created_at);
CREATE INDEX idx_likes_post_id     ON likes(post_id);
CREATE INDEX idx_likes_user_id     ON likes(user_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_follower_id  ON follows(follower_id);
