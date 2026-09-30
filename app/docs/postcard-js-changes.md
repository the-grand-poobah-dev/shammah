# Exact changes for `app/components/PostCard.js`

Open `app/components/PostCard.js`.

Find the place where media is currently rendered. It looks roughly like this:

```jsx
{post.media_url && post.media_type === 'image' && (
  <img className="post-media" src={post.media_url} alt="" />
)}
```

**Replace that whole block** with the expanded version below:

```jsx
{/* Media: image / video / reel / audio / podcast */}
{post.media_url && post.media_type === 'image' && (
  <img
    className="post-media"
    src={post.media_url}
    alt=""
    loading="lazy"
  />
)}
{post.media_url && (post.media_type === 'video' || post.media_type === 'reel') && (
  <video
    className="post-media"
    src={post.media_url}
    controls
    playsInline
    preload="metadata"
  />
)}
{post.media_url && (post.media_type === 'audio' || post.media_type === 'podcast') && (
  <div className="post-audio-wrap">
    <audio className="post-audio" src={post.media_url} controls preload="metadata" />
  </div>
)}
```

That is the only required change in PostCard for Step 3.

(Optional later: show a thumbnail if `post.media_thumbnail_url` exists, or a duration badge if `post.media_duration_seconds` is set.)
