/* ============================================================
   Commons — Social Media Platform
   Vanilla JavaScript — No frameworks, no React
   Communicates with Express.js backend via fetch()
   ============================================================ */

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  const API = '/api';
  let currentUser = null;
  let allUsers = [];
  let allPosts = [];
  let followingSet = new Set();
  let currentView = 'feed';
  let viewingProfileId = null;
  let viewedStories = new Set();
  let notifications = [];
  let msgConversations = {};

  // ─── DOM Helpers ────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const el = (tag, attrs, ...children) => {
    const node = document.createElement(tag);
    const safeAttrs = attrs || {};
    for (const [key, val] of Object.entries(safeAttrs)) {
      if (val == null) continue;
      if (key === 'class') node.className = val;
      else if (key === 'dataset') Object.assign(node.dataset, val || {});
      else if (key === 'html') node.innerHTML = val;
      else if (key.startsWith('on') && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === 'style' && typeof val === 'object') {
        Object.assign(node.style, val);
      } else {
        node.setAttribute(key, val);
      }
    }
    for (const child of children) {
      if (child == null) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  };

  // SVG icons
  const ICONS = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    bookmarkFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  };

  // ─── API Helpers ────────────────────────────────────────────
  async function apiFetch(path, options = {}) {
    const url = `${API}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON response from ${url}: ${text.slice(0, 300)}`);
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status} ${response.statusText} from ${url}`);
      }

      return data;
    } catch (error) {
      console.error('[API ERROR]', { url, message: error.message });
      throw error;
    }
  }

  async function apiDelete(path, body = {}) {
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      return data;
    } catch (err) {
      console.error(`API DELETE ${path}:`, err.message);
      throw err;
    }
  }

  // ─── Utilities ──────────────────────────────────────────────
  function formatRelativeTime(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo`;
    const years = Math.floor(days / 365);
    return `${years}y`;
  }

  function formatCount(n) {
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
    return `${(n / 1000000).toFixed(1)}M`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type = '') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  function getUserById(id) {
    return allUsers.find((u) => u.id === id);
  }

  function avatarUrl(user) {
    if (!user) return '';
    return user.profile_image || '';
  }

  // ─── Dark Mode ──────────────────────────────────────────────
  const THEME_KEY = 'commons:theme';

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const toggle = $('#darkModeToggle');
    if (toggle) toggle.checked = theme === 'dark';
  }

  function toggleTheme() {
    const current = getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  // ─── Current User Management ────────────────────────────────
  const STORAGE_KEY = 'commons:currentUserId';
  const DEFAULT_USER_ID = '11111111-1111-4111-8111-111111111111';

  function getCurrentUserId() {
    return currentUser?.id || localStorage.getItem(STORAGE_KEY) || DEFAULT_USER_ID;
  }

  function setCurrentUserId(id) {
    localStorage.setItem(STORAGE_KEY, id);
  }

  function updateCurrentUserBadge() {
    if (!currentUser) return;
    $('#currentUserAvatar').src = currentUser.profile_image;
    $('#currentUserAvatar').alt = currentUser.name;
    $('#composerAvatar').src = currentUser.profile_image;
    $('#composerAvatar').alt = currentUser.name;
    $('#switcherAvatar').src = currentUser.profile_image;
    $('#switcherAvatar').alt = currentUser.name;
    $('#switcherName').textContent = currentUser.name;
    const settingsName = $('#settingsUserName');
    if (settingsName) settingsName.textContent = currentUser.name;
  }

  // ─── Profile Switcher ───────────────────────────────────────
  function setupProfileSwitcher() {
    const btn = $('#switcherBtn');
    const dropdown = $('#switcherDropdown');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('open');
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      btn.classList.remove('open');
      dropdown.classList.remove('show');
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  function renderProfileSwitcher() {
    const dropdown = $('#switcherDropdown');
    dropdown.innerHTML = '';

    for (const user of allUsers) {
      const isActive = user.id === currentUser.id;
      const item = el('button', {
        class: `dropdown-item ${isActive ? 'active' : ''}`,
        onclick: () => {
          switchCurrentUser(user.id);
          const switcherBtn = $('#switcherBtn');
          switcherBtn.classList.remove('open');
          dropdown.classList.remove('show');
        },
      },
        el('img', { src: user.profile_image, alt: user.name }),
        el('div', { class: 'dropdown-item-info' },
          el('span', { class: 'dropdown-item-name' }, user.name),
          el('span', { class: 'dropdown-item-handle' }, `@${user.username}`)
        ),
        isActive ? el('span', { class: 'check-icon', html: ICONS.check }) : null
      );
      dropdown.appendChild(item);
    }
  }

  async function switchCurrentUser(userId) {
    setCurrentUserId(userId);
    currentUser = getUserById(userId);
    if (!currentUser) return;
    updateCurrentUserBadge();
    renderProfileSwitcher();
    await loadAllFollowingStatuses();
    await loadPosts();
    renderSidebar();
    renderStories();
    generateNotifications();
  }

  // ─── Data Loading ───────────────────────────────────────────
  async function loadUsers() {
    try {
      allUsers = await apiFetch('/users');
    } catch {
      showToast('Failed to load users', 'error');
      allUsers = [];
    }
  }

  async function loadPosts() {
    const feed = $('#postsFeed');

    if (!feed) {
      console.error('postsFeed element does not exist');
      return;
    }

    feed.innerHTML = renderSkeletonCards(3);

    if (!currentUser || !currentUser.id) {
      feed.innerHTML = `<div class="error-state"><p>Current user is not available.</p></div>`;
      console.error('loadPosts: currentUser is missing');
      return;
    }

    let posts;

    try {
      posts = await apiFetch(`/posts?user_id=${encodeURIComponent(currentUser.id)}`);
    } catch (error) {
      console.error('FEED API ERROR:', error);
      feed.innerHTML = `<div class="error-state">${ICONS.alert}<p>Could not load the feed.</p><small>${escapeHtml(error.message || 'Unknown API error')}</small><button class="btn-primary" style="margin-top:12px" onclick="loadPosts()">Try again</button></div>`;
      return;
    }

    if (!Array.isArray(posts)) {
      console.error('Invalid posts response:', posts);
      feed.innerHTML = `<div class="error-state">${ICONS.alert}<p>Invalid feed response from server.</p></div>`;
      return;
    }

    allPosts = posts.map((post) => ({
      ...post,
      content: post.content ?? '',
      image: post.image ?? null,
      like_count: Number(post.like_count ?? 0),
      comment_count: Number(post.comment_count ?? 0),
      liked_by_current_user: Boolean(post.liked_by_current_user ?? false),
      user: post.user && typeof post.user === 'object'
        ? post.user
        : getUserById(post.user_id) || { id: post.user_id ?? '', name: 'Unknown User', username: 'unknown', profile_image: '', bio: '' },
    }));

    try {
      renderPosts();
    } catch (error) {
      console.error('FEED RENDER ERROR:', error);
      feed.innerHTML = `<div class="error-state">${ICONS.alert}<p>Feed data loaded, but the feed could not be rendered.</p><small>${escapeHtml(error.message || 'Unknown rendering error')}</small></div>`;
    }
  }

  async function checkFollowingStatus(targetUserId) {
    if (!currentUser || targetUserId === currentUser.id) return false;
    try {
      const data = await apiFetch(`/users/${targetUserId}/following?follower_id=${currentUser.id}`);
      return data.following;
    } catch {
      return false;
    }
  }

  async function loadAllFollowingStatuses() {
    if (!currentUser) return;
    const promises = allUsers
      .filter((u) => u.id !== currentUser.id)
      .map(async (u) => {
        const isFollowing = await checkFollowingStatus(u.id);
        return { id: u.id, isFollowing };
      });
    const results = await Promise.all(promises);
    followingSet = new Set();
    for (const r of results) {
      if (r.isFollowing) followingSet.add(r.id);
    }
  }

  // ─── Skeleton Loading ───────────────────────────────────────
  function renderSkeletonCards(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<div class="skeleton-card">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div class="skeleton-line" style="width:44px;height:44px;border-radius:50%;flex-shrink:0"></div>
          <div style="flex:1"><div class="skeleton-line" style="width:40%"></div><div class="skeleton-line" style="width:25%;height:8px;margin-top:4px"></div></div>
        </div>
        <div class="skeleton-line" style="width:100%"></div>
        <div class="skeleton-line" style="width:80%"></div>
        <div class="skeleton-line" style="width:60%;height:8px"></div>
      </div>`;
    }
    return html;
  }

  // ─── Stories ───────────────────────────────────────────────
  function renderStories() {
    const container = $('#storiesContainer');
    if (!container) return;
    container.innerHTML = '';

    for (const user of allUsers) {
      const isViewed = viewedStories.has(user.id);
      const card = el('div', {
        class: `story-card ${isViewed ? 'viewed' : ''}`,
        onclick: () => openStory(user),
      },
        el('div', { class: 'story-ring' },
          el('div', { class: 'story-ring-inner' },
            el('img', { src: user.profile_image, alt: user.name })
          )
        ),
        el('span', { class: 'story-name' }, user.name.split(' ')[0])
      );
      container.appendChild(card);
    }
  }

  function openStory(user) {
    viewedStories.add(user.id);
    const modal = $('#storyModal');
    const overlay = $('#storyModalOverlay');
    const content = $('#storyModalContent');

    $('#storyModalAvatar').src = user.profile_image;
    $('#storyModalAvatar').alt = user.name;
    $('#storyModalName').textContent = user.name;

    const body = $('#storyModalBody');
    body.innerHTML = '';

    // Show user's latest post as story content, or a placeholder
    const userPosts = allPosts.filter((p) => p.user_id === user.id);
    if (userPosts.length > 0) {
      const post = userPosts[0];
      body.appendChild(el('p', { style: { marginBottom: '12px' } }, escapeHtml(post.content)));
      if (post.image) {
        body.appendChild(el('img', { src: post.image, alt: '', style: { maxWidth: '100%', borderRadius: '12px' } }));
      }
    } else {
      body.appendChild(el('p', null, `${user.name} hasn't shared a story yet.`));
      if (user.bio) {
        body.appendChild(el('p', { style: { marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' } }, user.bio));
      }
    }

    modal.style.display = 'flex';

    // Auto-close after 5 seconds
    clearTimeout(window._storyTimer);
    window._storyTimer = setTimeout(() => closeStory(), 5000);

    // Re-render stories to show viewed state
    renderStories();
  }

  function closeStory() {
    $('#storyModal').style.display = 'none';
    clearTimeout(window._storyTimer);
  }

  function setupStoryModal() {
    $('#storyModalClose').addEventListener('click', closeStory);
    $('#storyModalOverlay').addEventListener('click', closeStory);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#storyModal').style.display !== 'none') {
        closeStory();
      }
    });
  }

  // ─── Render Posts ───────────────────────────────────────────
  function renderPosts() {
    const feed = $('#postsFeed');
    feed.innerHTML = '';

    if (allPosts.length === 0) {
      feed.innerHTML = `<div class="empty-state">${ICONS.empty}<p>The feed is quiet. Be the first to share something.</p></div>`;
      return;
    }

    for (const post of allPosts) {
      feed.appendChild(createPostCard(post));
    }
  }

  function createPostCard(post) {
    const author = post.user || getUserById(post.user_id);
    const isOwnPost = currentUser && post.user_id === currentUser.id;
    const liked = post.liked_by_current_user || false;
    const likeCount = post.like_count || 0;
    const commentCount = post.comment_count || 0;

    const card = el('article', { class: 'post-card', dataset: { postId: post.id } });

    // Header
    const header = el('div', { class: 'post-header' });
    const avatar = el('img', {
      class: 'post-avatar',
      src: author?.profile_image || '',
      alt: author?.name || 'User',
      onclick: () => showProfile(post.user_id),
    });
    const authorInfo = el('div', { class: 'post-author' },
      el('span', { class: 'post-author-name', onclick: () => showProfile(post.user_id) }, author?.name || 'Unknown'),
      el('span', { class: 'post-author-handle' }, `@${author?.username || 'unknown'}`),
      el('div', { class: 'post-meta' },
        el('span', null, formatRelativeTime(post.created_at))
      )
    );
    header.appendChild(avatar);
    header.appendChild(authorInfo);

    // More button / menu
    const moreWrapper = el('div', { class: 'post-more-menu' });
    const moreBtn = el('button', {
      class: 'post-more-btn',
      'aria-label': 'More options',
      onclick: (e) => {
        e.stopPropagation();
        const menu = moreWrapper.querySelector('.post-more-menu-items');
        menu.classList.toggle('show');
      },
      html: ICONS.more,
    });
    const menuItems = el('div', { class: 'post-more-menu-items' });

    if (isOwnPost) {
      menuItems.appendChild(el('button', {
        class: 'post-more-menu-item danger',
        onclick: () => deletePost(post.id, card),
        html: `${ICONS.trash}<span>Delete</span>`,
      }));
    }
    menuItems.appendChild(el('button', {
      class: 'post-more-menu-item',
      onclick: () => {
        if (navigator.share) {
          navigator.share({ text: post.content }).catch(() => {});
        } else {
          showToast('Share link copied');
        }
        menuItems.classList.remove('show');
      },
      html: `${ICONS.share}<span>Share</span>`,
    }));
    menuItems.appendChild(el('button', {
      class: 'post-more-menu-item',
      onclick: () => {
        showToast('Post saved');
        menuItems.classList.remove('show');
      },
      html: `${ICONS.bookmark}<span>Save</span>`,
    }));

    moreWrapper.appendChild(moreBtn);
    moreWrapper.appendChild(menuItems);
    header.appendChild(moreWrapper);

    card.appendChild(header);

    // Close menu on outside click
    document.addEventListener('click', () => menuItems.classList.remove('show'));

    // Body
    if (post.content) {
      card.appendChild(el('div', { class: 'post-body' }, escapeHtml(post.content)));
    }

    // Image
    if (post.image) {
      card.appendChild(
        el('div', { class: 'post-image-wrapper' },
          el('img', { class: 'post-image', src: post.image, alt: '', loading: 'lazy' })
        )
      );
    }

    // Actions
    const likeBtn = el('button', {
      class: `like-btn ${liked ? 'liked' : ''}`,
      onclick: () => toggleLike(post.id, likeBtn, card),
      'aria-label': liked ? 'Unlike' : 'Like',
      html: `${liked ? ICONS.heartFilled : ICONS.heart}<span class="count-num">${formatCount(likeCount)}</span>`,
    });

    const commentBtn = el('button', {
      class: 'comment-btn',
      onclick: () => toggleComments(card, post.id),
      'aria-label': 'Comment',
      html: `${ICONS.comment}<span class="count-num">${formatCount(commentCount)}</span>`,
    });

    const shareBtn = el('button', {
      class: 'share-btn',
      onclick: () => {
        if (navigator.share) {
          navigator.share({ text: post.content }).catch(() => {});
        } else {
          showToast('Share link copied');
        }
      },
      'aria-label': 'Share',
      html: ICONS.share,
    });

    const bookmarkBtn = el('button', {
      class: 'bookmark-btn',
      onclick: () => {
        bookmarkBtn.classList.toggle('saved');
        const saved = bookmarkBtn.classList.contains('saved');
        bookmarkBtn.innerHTML = saved ? ICONS.bookmarkFilled : ICONS.bookmark;
        showToast(saved ? 'Post saved' : 'Post removed');
      },
      'aria-label': 'Bookmark',
      html: ICONS.bookmark,
    });

    card.appendChild(el('div', { class: 'post-actions' }, likeBtn, commentBtn, shareBtn, bookmarkBtn));

    // Comments container (lazy-loaded)
    card.appendChild(el('div', { class: 'comments-section', style: { display: 'none' }, dataset: { loaded: 'false' } }));

    return card;
  }

  // ─── Delete Post ────────────────────────────────────────────
  async function deletePost(postId, cardEl) {
    if (!confirm('Delete this post?')) return;
    try {
      await apiDelete(`/posts/${postId}`);
      cardEl.style.transition = 'all 0.3s ease';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'translateX(-20px)';
      setTimeout(() => {
        cardEl.remove();
        allPosts = allPosts.filter((p) => p.id !== postId);
      }, 300);
      showToast('Post deleted', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete post', 'error');
    }
  }

  // ─── Like / Unlike ──────────────────────────────────────────
  async function toggleLike(postId, btn, card) {
    if (!currentUser) return;
    const isLiked = btn.classList.contains('liked');
    const countSpan = btn.querySelector('.count-num');
    const currentCount = parseInt(countSpan.textContent.replace(/[kM]/, '')) || 0;

    // Optimistic update
    if (isLiked) {
      btn.classList.remove('liked');
      btn.innerHTML = `${ICONS.heart}<span class="count-num">${formatCount(Math.max(0, currentCount - 1))}</span>`;
    } else {
      btn.classList.add('liked');
      btn.innerHTML = `${ICONS.heartFilled}<span class="count-num">${formatCount(currentCount + 1)}</span>`;
    }

    try {
      if (isLiked) {
        await apiDelete(`/posts/${postId}/like`, { user_id: currentUser.id });
      } else {
        await apiFetch(`/posts/${postId}/like`, {
          method: 'POST',
          body: JSON.stringify({ user_id: currentUser.id }),
        });
      }
      // Update local state
      const post = allPosts.find((p) => p.id === postId);
      if (post) {
        post.liked_by_current_user = !isLiked;
        post.like_count = isLiked ? Math.max(0, (post.like_count || 0) - 1) : (post.like_count || 0) + 1;
      }
    } catch (err) {
      // Revert on error
      if (isLiked) {
        btn.classList.add('liked');
        btn.innerHTML = `${ICONS.heartFilled}<span class="count-num">${formatCount(currentCount)}</span>`;
      } else {
        btn.classList.remove('liked');
        btn.innerHTML = `${ICONS.heart}<span class="count-num">${formatCount(currentCount)}</span>`;
      }
      showToast(err.message || 'Failed to toggle like', 'error');
    }
  }

  // ─── Comments ───────────────────────────────────────────────
  async function toggleComments(card, postId) {
    const section = card.querySelector('.comments-section');
    const isVisible = section.style.display !== 'none';

    if (isVisible) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    if (section.dataset.loaded === 'false') {
      await loadComments(postId, section);
    }
  }

  async function loadComments(postId, section) {
    section.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

    try {
      const comments = await apiFetch(`/posts/${postId}/comments`);
      renderComments(postId, comments, section);
    } catch {
      section.innerHTML = `<div class="error-state"><p>Could not load comments.</p></div>`;
    }
  }

  function renderComments(postId, comments, section) {
    section.innerHTML = '';
    section.dataset.loaded = 'true';

    if (comments.length === 0) {
      section.appendChild(el('p', { class: 'no-comments' }, 'No comments yet. Start the conversation.'));
    } else {
      for (const comment of comments) {
        section.appendChild(createCommentItem(comment));
      }
    }

    // Comment form
    const form = el('div', { class: 'comment-form' },
      el('img', { src: currentUser?.profile_image || '', alt: currentUser?.name || '' })
    );
    const input = el('input', {
      class: 'comment-input',
      type: 'text',
      placeholder: 'Add a comment…',
      'aria-label': 'Add a comment',
    });
    const sendBtn = el('button', {
      class: 'comment-send',
      disabled: 'true',
      'aria-label': 'Send comment',
      html: ICONS.send,
      onclick: () => submitComment(postId, input, sendBtn, section),
    });
    input.addEventListener('input', () => {
      sendBtn.disabled = input.value.trim().length === 0;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        submitComment(postId, input, sendBtn, section);
      }
    });
    form.appendChild(input);
    form.appendChild(sendBtn);
    section.appendChild(form);
  }

  function createCommentItem(comment) {
    return el('div', { class: 'comment-item' },
      el('img', {
        class: 'comment-avatar',
        src: comment.user?.profile_image || '',
        alt: comment.user?.name || '',
        onclick: () => showProfile(comment.user_id),
      }),
      el('div', { class: 'comment-body' },
        el('div', { class: 'comment-header' },
          el('span', { class: 'comment-name', onclick: () => showProfile(comment.user_id) }, comment.user?.name || 'Unknown'),
          el('span', { class: 'comment-time' }, formatRelativeTime(comment.created_at))
        ),
        el('p', { class: 'comment-text' }, escapeHtml(comment.content))
      )
    );
  }

  async function submitComment(postId, input, sendBtn, section) {
    const content = input.value.trim();
    if (!content || !currentUser) return;

    sendBtn.disabled = true;
    input.value = '';

    try {
      const comment = await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUser.id, content }),
      });

      // Remove "no comments" message if present
      const noComments = section.querySelector('.no-comments');
      if (noComments) noComments.remove();

      // Add comment to the list
      const commentEl = createCommentItem(comment);
      const form = section.querySelector('.comment-form');
      section.insertBefore(commentEl, form);

      // Update post comment count in the feed
      const card = section.closest('.post-card');
      const commentBtn = card.querySelector('.comment-btn .count-num');
      const post = allPosts.find((p) => p.id === postId);
      if (post) {
        post.comment_count = (post.comment_count || 0) + 1;
        if (commentBtn) commentBtn.textContent = formatCount(post.comment_count);
      }
    } catch (err) {
      input.value = content;
      showToast(err.message || 'Failed to add comment', 'error');
    } finally {
      sendBtn.disabled = false;
    }
  }

  // ─── Sidebar ────────────────────────────────────────────────
  function renderSidebar() {
    const list = $('#whoToFollow');
    list.innerHTML = '';

    const searchInput = $('#searchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = allUsers.filter((u) =>
      (!currentUser || u.id !== currentUser.id) &&
      (!query ||
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      list.appendChild(el('li', null, el('p', { class: 'no-comments' }, 'No one matches that search.')));
      return;
    }

    for (const user of filtered) {
      const isActive = currentUser && user.id === currentUser.id;
      const isFollowing = followingSet.has(user.id);

      const li = el('li', { class: 'follow-item' });

      const link = el('button', {
        class: 'follow-user-link',
        onclick: () => showProfile(user.id),
      },
        el('img', {
          class: `follow-user-avatar ${isActive ? 'active' : ''}`,
          src: user.profile_image,
          alt: user.name,
        }),
        el('div', { class: 'follow-user-info' },
          el('span', { class: 'follow-user-name' }, user.name),
          el('span', { class: 'follow-user-handle' }, `@${user.username}`)
        )
      );

      li.appendChild(link);

      if (!isActive) {
        const followBtn = el('button', {
          class: `follow-btn ${isFollowing ? 'following' : 'not-following'}`,
          onclick: () => toggleFollow(user.id, followBtn),
          html: isFollowing
            ? `${ICONS.check}<span>Following</span>`
            : `${ICONS.userPlus}<span>Follow</span>`,
        });
        li.appendChild(followBtn);
      }

      list.appendChild(li);
    }

    // Render trending
    renderTrending();
  }

  function renderTrending() {
    const list = $('#trendingList');
    if (!list) return;
    list.innerHTML = '';

    // Derive trending from post content keywords
    const wordFreq = {};
    for (const post of allPosts) {
      if (!post.content) continue;
      const words = post.content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      for (const w of words) {
        if (['this', 'that', 'with', 'have', 'from', 'they', 'will', 'been', 'your', 'what', 'about', 'there', 'would', 'could', 'their', 'which', 'very', 'just', 'like'] .includes(w)) continue;
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }

    const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (sorted.length === 0) {
      list.appendChild(el('li', { class: 'no-comments' }, 'No trending topics yet.'));
      return;
    }

    sorted.forEach(([word, count], i) => {
      list.appendChild(el('li', {
        class: 'trending-item',
        onclick: () => {
          $('#searchInput').value = word;
          renderSidebar();
        },
      },
        el('div', { class: 'trending-rank' }, `#${i + 1} · Trending`),
        el('div', { class: 'trending-tag' }, `#${word}`),
        el('div', { class: 'trending-count' }, `${formatCount(count)} posts`)
      ));
    });
  }

  async function toggleFollow(targetUserId, btn) {
    if (!currentUser) return;
    const isFollowing = followingSet.has(targetUserId);
    btn.disabled = true;

    try {
      if (isFollowing) {
        await apiDelete(`/users/${targetUserId}/follow`, { follower_id: currentUser.id });
        followingSet.delete(targetUserId);
        btn.classList.remove('following');
        btn.classList.add('not-following');
        btn.innerHTML = `${ICONS.userPlus}<span>Follow</span>`;
        showToast('Unfollowed');
      } else {
        await apiFetch(`/users/${targetUserId}/follow`, {
          method: 'POST',
          body: JSON.stringify({ follower_id: currentUser.id }),
        });
        followingSet.add(targetUserId);
        btn.classList.remove('not-following');
        btn.classList.add('following');
        btn.innerHTML = `${ICONS.check}<span>Following</span>`;
        showToast('Following', 'success');
      }
      generateNotifications();
    } catch (err) {
      showToast(err.message || 'Failed to toggle follow', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ─── Composer ───────────────────────────────────────────────
  function setupComposer() {
    const textarea = $('#postContent');
    const publishBtn = $('#publishBtn');
    const charCount = $('#charCount');
    const imageInput = $('#imageInput');
    const imagePreview = $('#imagePreview');
    const previewImg = $('#previewImg');
    const removeImageBtn = $('#removeImage');
    const errorDiv = $('#composerError');
    let imageDataUrl = null;

    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len}/500`;
      publishBtn.disabled = textarea.value.trim().length === 0;
      errorDiv.classList.remove('show');
    });

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        imageDataUrl = reader.result;
        previewImg.src = imageDataUrl;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    removeImageBtn.addEventListener('click', () => {
      imageDataUrl = null;
      imagePreview.style.display = 'none';
      imageInput.value = '';
    });

    publishBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content || !currentUser) return;

      publishBtn.disabled = true;
      publishBtn.textContent = 'Posting…';
      errorDiv.classList.remove('show');

      try {
        const newPost = await apiFetch('/posts', {
          method: 'POST',
          body: JSON.stringify({
            user_id: currentUser.id,
            content,
            image: imageDataUrl,
          }),
        });

        // Prepend to feed
        allPosts.unshift(newPost);
        renderPosts();

        // Reset composer
        textarea.value = '';
        charCount.textContent = '0/500';
        imageDataUrl = null;
        imagePreview.style.display = 'none';
        imageInput.value = '';
        publishBtn.disabled = true;
        showToast('Post published', 'success');
      } catch (err) {
        errorDiv.textContent = err.message || 'Could not publish. Please try again.';
        errorDiv.classList.add('show');
      } finally {
        publishBtn.textContent = 'Post';
        publishBtn.disabled = textarea.value.trim().length === 0;
      }
    });
  }

  // ─── Profile View ───────────────────────────────────────────
  async function showProfile(userId) {
    if (!userId) {
      console.error('showProfile called without userId');
      return;
    }

    viewingProfileId = userId;
    switchView('profile');

    const page = $('#profilePage');

    if (!page) {
      console.error('profilePage element does not exist');
      return;
    }

    page.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

    let user;

    try {
      user = await apiFetch(`/users/${encodeURIComponent(userId)}`);
    } catch (error) {
      console.error('PROFILE USER API ERROR:', error);
      page.innerHTML = `<div class="error-state">${ICONS.alert}<p>Could not load this profile.</p><small>${escapeHtml(error.message || 'Unknown API error')}</small></div>`;
      return;
    }

    let posts;

    try {
      posts = await apiFetch(`/users/${encodeURIComponent(userId)}/posts`);
    } catch (error) {
      console.error('PROFILE POSTS API ERROR:', error);
      page.innerHTML = `<div class="error-state">${ICONS.alert}<p>Profile loaded, but posts could not be loaded.</p><small>${escapeHtml(error.message || 'Unknown API error')}</small></div>`;
      return;
    }

    let isFollowing = false;

    if (currentUser && userId !== currentUser.id) {
      try {
        isFollowing = await checkFollowingStatus(userId);
      } catch (error) {
        console.error('PROFILE FOLLOW STATUS ERROR:', error);
      }
    }

    try {
      if (!Array.isArray(posts)) {
        throw new Error('Profile posts response is not an array');
      }

      const safeUser = user || {};
      const normalizedPosts = posts.map((post) => ({
        ...post,
        content: post.content ?? '',
        image: post.image ?? null,
        like_count: Number(post.like_count ?? 0),
        comment_count: Number(post.comment_count ?? 0),
        liked_by_current_user: Boolean(post.liked_by_current_user ?? false),
        user: post.user && typeof post.user === 'object'
          ? post.user
          : safeUser,
      }));

      renderProfilePage(safeUser, normalizedPosts, isFollowing);
    } catch (error) {
      console.error('PROFILE RENDER ERROR:', error);
      page.innerHTML = `<div class="error-state">${ICONS.alert}<p>Profile data loaded, but the profile could not be rendered.</p><small>${escapeHtml(error.message || 'Unknown rendering error')}</small></div>`;
    }
  }

  function renderProfilePage(user, posts, isFollowing) {
    const page = $('#profilePage');
    const safeUser = {
      ...(user || {}),
      id: user?.id ?? '',
      name: user?.name ?? 'Unknown User',
      username: user?.username ?? 'unknown',
      bio: user?.bio ?? '',
      profile_image: user?.profile_image ?? '',
      posts_count: Number(user?.posts_count ?? 0),
      followers_count: Number(user?.followers_count ?? 0),
      following_count: Number(user?.following_count ?? 0),
    };
    const isOwnProfile = currentUser && safeUser.id === currentUser.id;

    page.innerHTML = '';

    // Profile header
    const header = el('div', { class: 'profile-header' },
      el('div', { class: 'profile-banner' }),
      el('div', { class: 'profile-header-body' },
        el('img', { class: 'profile-page-avatar', src: safeUser.profile_image, alt: safeUser.name }),
        el('h2', { class: 'profile-page-name' }, safeUser.name),
        el('p', { class: 'profile-page-handle' }, `@${safeUser.username}`),
        el('p', { class: 'profile-page-bio' }, safeUser.bio || 'No bio yet.'),
        el('div', { class: 'profile-page-stats' },
          el('div', { class: 'profile-stat' },
            el('div', { class: 'profile-stat-num' }, formatCount(safeUser.posts_count)),
            el('div', { class: 'profile-stat-label' }, 'Posts')
          ),
          el('div', { class: 'profile-stat' },
            el('div', { class: 'profile-stat-num' }, formatCount(safeUser.followers_count)),
            el('div', { class: 'profile-stat-label' }, 'Followers')
          ),
          el('div', { class: 'profile-stat' },
            el('div', { class: 'profile-stat-num' }, formatCount(safeUser.following_count)),
            el('div', { class: 'profile-stat-label' }, 'Following')
          )
        )
      )
    );

    // Follow button (only for other users)
    if (!isOwnProfile) {
      const followBtn = el('button', {
        class: `btn-follow-large ${isFollowing ? 'following' : 'not-following'}`,
        onclick: async () => {
          await toggleFollow(safeUser.id, followBtn);
          showProfile(safeUser.id);
        },
      }, isFollowing ? 'Following' : 'Follow');
      header.querySelector('.profile-header-body').appendChild(el('div', { class: 'profile-page-actions' }, followBtn));
    }

    page.appendChild(header);

    // Posts section
    page.appendChild(el('h3', { class: 'profile-posts-title' }, `${safeUser.name.split(' ')[0]}'s Posts`));

    if (!Array.isArray(posts) || posts.length === 0) {
      page.appendChild(el('div', { class: 'profile-empty' }, 'No posts yet.'));
      return;
    }

    const postsContainer = el('div', { class: 'posts-feed' });
    for (const post of posts) {
      postsContainer.appendChild(createPostCard(post));
    }
    page.appendChild(postsContainer);
  }

  // ─── Explore View ───────────────────────────────────────────
  function renderExplore() {
    const grid = $('#exploreGrid');
    grid.innerHTML = '';

    if (allUsers.length === 0) {
      grid.innerHTML = '<div class="empty-state">No users to discover yet.</div>';
      return;
    }

    for (const user of allUsers) {
      const card = el('div', {
        class: 'explore-card',
        onclick: () => showProfile(user.id),
      },
        el('img', { src: user.profile_image, alt: user.name }),
        el('div', { class: 'explore-card-name' }, user.name),
        el('div', { class: 'explore-card-handle' }, `@${user.username}`),
        el('p', { class: 'explore-card-bio' }, user.bio || ''),
        el('div', { class: 'explore-card-stats' },
          el('span', null, `${formatCount(user.followers_count || 0)} followers`)
        )
      );
      grid.appendChild(card);
    }
  }

  async function loadExploreData() {
    // Fetch counts for each user
    const promises = allUsers.map(async (u) => {
      try {
        const data = await apiFetch(`/users/${u.id}`);
        u.followers_count = data.followers_count;
        u.following_count = data.following_count;
        u.posts_count = data.posts_count;
      } catch {
        // ignore
      }
    });
    await Promise.all(promises);
    renderExplore();
  }

  // ─── Notifications ──────────────────────────────────────────
  function generateNotifications() {
    if (!currentUser) {
      notifications = [];
      return;
    }

    notifications = [];

    // Derive from follows (people following current user)
    for (const user of allUsers) {
      if (user.id === currentUser.id) continue;
      // Check if this user follows current user
      // We can't easily check this without a new API, so we'll derive from follows set
      // If current user follows someone, we show "you followed X"
      if (followingSet.has(user.id)) {
        notifications.push({
          type: 'follow',
          user: user,
          text: `You are following <strong>${escapeHtml(user.name)}</strong>`,
          time: 'recently',
        });
      }
    }

    // Derive from likes on current user's posts
    for (const post of allPosts) {
      if (post.user_id === currentUser.id && (post.like_count || 0) > 0) {
        const author = post.user || getUserById(post.user_id);
        notifications.push({
          type: 'like',
          user: author,
          text: `Your post has <strong>${post.like_count} like${post.like_count !== 1 ? 's' : ''}</strong>`,
          time: formatRelativeTime(post.created_at),
        });
      }
      if (post.user_id === currentUser.id && (post.comment_count || 0) > 0) {
        const author = post.user || getUserById(post.user_id);
        notifications.push({
          type: 'comment',
          user: author,
          text: `Your post has <strong>${post.comment_count} comment${post.comment_count !== 1 ? 's' : ''}</strong>`,
          time: formatRelativeTime(post.created_at),
        });
      }
    }

    // Update badges
    const count = notifications.length;
    const badge = $('#notifBadge');
    const navBadge = $('#navNotifBadge');
    const bottomBadge = $('#bottomNotifBadge');
    if (count > 0) {
      if (badge) { badge.style.display = 'flex'; badge.textContent = count; }
      if (navBadge) { navBadge.style.display = 'flex'; navBadge.textContent = count; }
      if (bottomBadge) { bottomBadge.style.display = 'flex'; bottomBadge.textContent = count; }
    } else {
      if (badge) badge.style.display = 'none';
      if (navBadge) navBadge.style.display = 'none';
      if (bottomBadge) bottomBadge.style.display = 'none';
    }
  }

  function renderNotifications() {
    const list = $('#notificationsList');
    list.innerHTML = '';

    if (notifications.length === 0) {
      list.innerHTML = '<div class="notif-page-empty">No notifications yet.</div>';
      return;
    }

    for (const notif of notifications) {
      const item = el('div', {
        class: 'notif-page-item',
        onclick: () => {
          if (notif.user) showProfile(notif.user.id);
        },
      },
        el('img', { src: notif.user?.profile_image || '', alt: notif.user?.name || '' }),
        el('div', { class: 'notif-page-text', html: notif.text }),
        el('span', { class: 'notif-page-time' }, notif.time)
      );
      list.appendChild(item);
    }
  }

  function renderNotifDropdown() {
    const list = $('#notifList');
    list.innerHTML = '';

    if (notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      return;
    }

    for (const notif of notifications.slice(0, 10)) {
      const item = el('div', {
        class: 'notif-item',
        onclick: () => {
          $('#notifDropdown').style.display = 'none';
          if (notif.user) showProfile(notif.user.id);
        },
      },
        el('img', { src: notif.user?.profile_image || '', alt: notif.user?.name || '' }),
        el('div', {},
          el('div', { class: 'notif-item-text', html: notif.text }),
          el('div', { class: 'notif-item-time' }, notif.time)
        )
      );
      list.appendChild(item);
    }
  }

  // ─── Messages (Demo) ────────────────────────────────────────
  function renderMessages() {
    const list = $('#msgUserList');
    list.innerHTML = '';

    for (const user of allUsers) {
      if (currentUser && user.id === currentUser.id) continue;
      const item = el('div', {
        class: 'messages-user-item',
        onclick: () => openConversation(user),
      },
        el('img', { src: user.profile_image, alt: user.name }),
        el('div', {},
          el('div', { class: 'mu-name' }, user.name),
          el('div', { class: 'mu-preview' }, msgConversations[user.id]?.[msgConversations[user.id]?.length - 1]?.text || 'Start a conversation')
        )
      );
      list.appendChild(item);
    }

    // Also render dropdown
    renderMsgDropdown();
  }

  function renderMsgDropdown() {
    const list = $('#msgList');
    if (!list) return;
    list.innerHTML = '';

    for (const user of allUsers) {
      if (currentUser && user.id === currentUser.id) continue;
      const item = el('div', {
        class: 'msg-dropdown-item',
        onclick: () => {
          $('#msgDropdown').style.display = 'none';
          switchView('messages');
          setTimeout(() => openConversation(user), 100);
        },
      },
        el('img', { src: user.profile_image, alt: user.name }),
        el('div', {},
          el('div', { class: 'md-name' }, user.name),
          el('div', { class: 'md-preview' }, msgConversations[user.id]?.[msgConversations[user.id]?.length - 1]?.text || 'Tap to chat')
        )
      );
      list.appendChild(item);
    }
  }

  function openConversation(user) {
    const chat = $('#msgChat');
    const conv = msgConversations[user.id] || [];

    chat.innerHTML = '';

    // Header
    chat.appendChild(el('div', { class: 'messages-chat-header' },
      el('img', { src: user.profile_image, alt: user.name }),
      el('span', null, user.name)
    ));

    // Body
    const body = el('div', { class: 'messages-chat-body' });
    if (conv.length === 0) {
      body.appendChild(el('div', { class: 'message-bubble received' }, `Hi! I'm ${user.name}. This is a demo chat — messages are not persisted.`));
    } else {
      for (const msg of conv) {
        body.appendChild(el('div', { class: `message-bubble ${msg.sent ? 'sent' : 'received'}` }, msg.text));
      }
    }
    chat.appendChild(body);

    // Input
    const inputArea = el('div', { class: 'messages-chat-input' });
    const input = el('input', { type: 'text', placeholder: 'Type a message…', 'aria-label': 'Type a message' });
    const sendBtn = el('button', {
      onclick: () => {
        const text = input.value.trim();
        if (!text) return;
        if (!msgConversations[user.id]) msgConversations[user.id] = [];
        msgConversations[user.id].push({ text, sent: true });
        openConversation(user);
        // Simulate reply
        setTimeout(() => {
          msgConversations[user.id].push({ text: 'Thanks for your message! This is a demo.', sent: false });
          openConversation(user);
        }, 1500);
      },
    }, 'Send');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });
    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    chat.appendChild(inputArea);

    // Highlight active user
    $$('.messages-user-item').forEach((item) => item.classList.remove('active'));
    // Can't easily match, skip for now
  }

  // ─── Header Search ──────────────────────────────────────────
  function setupHeaderSearch() {
    const input = $('#headerSearch');
    const results = $('#headerSearchResults');

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      if (!query) {
        results.classList.remove('show');
        return;
      }

      const filtered = allUsers.filter((u) =>
        u.name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query)
      );

      results.innerHTML = '';

      if (filtered.length === 0) {
        results.appendChild(el('div', { class: 'search-no-results' }, 'No results found'));
      } else {
        for (const user of filtered) {
          results.appendChild(el('div', {
            class: 'search-result-item',
            onclick: () => {
              results.classList.remove('show');
              input.value = '';
              showProfile(user.id);
            },
          },
            el('img', { src: user.profile_image, alt: user.name }),
            el('div', {},
              el('div', { class: 'sr-name' }, user.name),
              el('div', { class: 'sr-handle' }, `@${user.username}`)
            )
          ));
        }
      }
      results.classList.add('show');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search')) {
        results.classList.remove('show');
      }
    });
  }

  // ─── View Navigation ────────────────────────────────────────
  function switchView(view) {
    currentView = view;

    // Update sidebar nav
    $$('.sidebar-nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update bottom nav
    $$('.bottom-nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Show/hide views
    $('#viewFeed').style.display = view === 'feed' ? '' : 'none';
    $('#viewProfile').style.display = view === 'profile' ? '' : 'none';
    $('#viewExplore').style.display = view === 'explore' ? '' : 'none';
    $('#viewNotifications').style.display = view === 'notifications' ? '' : 'none';
    $('#viewMessages').style.display = view === 'messages' ? '' : 'none';
    $('#viewSettings').style.display = view === 'settings' ? '' : 'none';

    if (view === 'explore') {
      loadExploreData();
    }
    if (view === 'notifications') {
      renderNotifications();
    }
    if (view === 'messages') {
      renderMessages();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    // Sidebar nav items
    $$('.sidebar-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const nav = btn.dataset.nav;
        if (view) {
          switchView(view);
        } else if (nav === 'notifications') {
          switchView('notifications');
        } else if (nav === 'messages') {
          switchView('messages');
        } else if (nav === 'profile') {
          if (currentUser) showProfile(currentUser.id);
        } else if (nav === 'settings') {
          switchView('settings');
        }
      });
    });

    // Bottom nav items
    $$('.bottom-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const nav = btn.dataset.nav;
        if (view) {
          switchView(view);
        } else if (nav === 'notifications') {
          switchView('notifications');
        } else if (nav === 'messages') {
          switchView('messages');
        } else if (nav === 'profile') {
          if (currentUser) showProfile(currentUser.id);
        }
      });
    });

    // Logo click goes to feed
    $('#logoBtn').addEventListener('click', () => switchView('feed'));

    // Current user avatar click goes to profile
    $('#currentUserBadge').addEventListener('click', () => {
      if (currentUser) showProfile(currentUser.id);
    });
  }

  // ─── Search ─────────────────────────────────────────────────
  function setupSearch() {
    const searchInput = $('#searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderSidebar());
    }
  }

  // ─── Dropdowns (Notifications & Messages) ───────────────────
  function setupDropdowns() {
    const notifBtn = $('#notifBtn');
    const notifDropdown = $('#notifDropdown');
    const msgBtn = $('#msgBtn');
    const msgDropdown = $('#msgDropdown');

    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = notifDropdown.style.display !== 'none';
      notifDropdown.style.display = 'none';
      msgDropdown.style.display = 'none';
      if (!isOpen) {
        renderNotifDropdown();
        notifDropdown.style.display = 'block';
      }
    });

    msgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = msgDropdown.style.display !== 'none';
      notifDropdown.style.display = 'none';
      msgDropdown.style.display = 'none';
      if (!isOpen) {
        renderMsgDropdown();
        msgDropdown.style.display = 'block';
      }
    });

    document.addEventListener('click', () => {
      notifDropdown.style.display = 'none';
      msgDropdown.style.display = 'none';
    });

    notifDropdown.addEventListener('click', (e) => e.stopPropagation());
    msgDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // ─── Theme Toggle ──────────────────────────────────────────
  function setupThemeToggle() {
    $('#themeToggle').addEventListener('click', toggleTheme);
    const darkToggle = $('#darkModeToggle');
    if (darkToggle) {
      darkToggle.addEventListener('change', toggleTheme);
    }
  }

  // ─── Messages Search ───────────────────────────────────────
  function setupMsgSearch() {
    const input = $('#msgSearchInput');
    if (!input) return;
    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      const items = $$('.messages-user-item');
      items.forEach((item) => {
        const name = item.querySelector('.mu-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    setTheme(getTheme());

    setupProfileSwitcher();
    setupComposer();
    setupNavigation();
    setupSearch();
    setupStoryModal();
    setupDropdowns();
    setupThemeToggle();
    setupHeaderSearch();
    setupMsgSearch();

    await loadUsers();

    if (!allUsers || allUsers.length === 0) {
      console.error('No users returned from /api/users');
      return;
    }

    const storedId = localStorage.getItem(STORAGE_KEY);
    currentUser = allUsers.find((user) => user.id === storedId) || allUsers[0];

    if (!currentUser) {
      console.error('Unable to determine current user');
      return;
    }

    setCurrentUserId(currentUser.id);

    updateCurrentUserBadge();
    renderProfileSwitcher();

    await loadAllFollowingStatuses();
    renderSidebar();
    renderStories();
    renderMessages();
    generateNotifications();
    await loadPosts();
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
