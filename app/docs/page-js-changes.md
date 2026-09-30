# Exact changes for `app/page.js`

Open `app/page.js` in your editor and apply the following edits carefully.

---

## 1. Add the import (near the top with the other imports)

```js
import { uploadPostMedia } from './lib/mediaUpload';
```

(If your relative path is different, adjust. From `app/page.js` the path above is correct.)

---

## 2. Add new state variables (with the other useState calls, around the compose state)

Find the block that looks roughly like:

```js
const [composeText, setComposeText] = useState('');
const [composeCategory, setComposeCategory] = useState('prayer');
```

Add these lines right after it:

```js
const [mediaFile, setMediaFile] = useState(null);
const [mediaPreview, setMediaPreview] = useState(null);
const [mediaUploading, setMediaUploading] = useState(false);
```

---

## 3. Update `handleCreatePost`

Find the function `async function handleCreatePost(e)`.

**A.** Right after the poll-upload block (after `setPollUploading(false);`) and **before** the `supabase.from('posts').insert(...)` call, insert this media-upload block:

```js
    // --- Real media upload (image / video / audio) ---
    let media_url = null;
    let media_type = null;
    if (mediaFile) {
      setMediaUploading(true);
      try {
        const uploaded = await uploadPostMedia(mediaFile, session.user.id);
        media_url = uploaded.url;
        media_type = uploaded.type;
      } catch (err) {
        setPostError(err.message || 'Media upload failed');
        setPosting(false);
        setMediaUploading(false);
        return;
      }
      setMediaUploading(false);
    }
```

**B.** Change the `.insert({...})` object so it also sends the media fields.  
It currently looks similar to:

```js
.insert({
  author_id: session.user.id,
  church_id: profile?.church_id ?? null,
  category_id: composeCategory,
  text_content: text,
})
```

Change it to:

```js
.insert({
  author_id: session.user.id,
  church_id: profile?.church_id ?? null,
  category_id: composeCategory,
  text_content: text || null,
  media_url,
  media_type,
})
```

**C.** After a successful post (near `setComposeText('');`), also clear the media state:

```js
    setComposeText('');
    setIsPoll(false);
    setPollOptions([{ label: '', file: null, preview: null }, { label: '', file: null, preview: null }]);
    setMediaFile(null);
    setMediaPreview(null);
```

---

## 4. Add the media picker UI inside the compose form

Find the `<form className="compose" ...>` block.

Place this block **inside** the form, preferably just above the textarea or just below it (wherever looks best to you):

```jsx
          {/* Media attachment */}
          <div className="compose-media">
            {mediaPreview && (
              <div className="media-preview">
                {mediaFile?.type?.startsWith('image/') && (
                  <img src={mediaPreview} alt="Preview" />
                )}
                {mediaFile?.type?.startsWith('video/') && (
                  <video src={mediaPreview} controls playsInline />
                )}
                {mediaFile?.type?.startsWith('audio/') && (
                  <audio src={mediaPreview} controls />
                )}
                <button
                  type="button"
                  className="media-remove"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                >
                  Remove
                </button>
              </div>
            )}
            <label className="media-pick">
              📷 / 🎥 / 🎵 Add photo, video or audio
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setMediaFile(f);
                  setMediaPreview(URL.createObjectURL(f));
                  e.target.value = '';
                }}
              />
            </label>
            {mediaUploading && <p className="mut-light">Uploading media…</p>}
          </div>
```

---

## 5. Disable the Post button while media is uploading

Find the submit button that has something like:

```js
disabled={
  !composeText.trim() ||
  posting ||
  ...
}
```

Add `|| mediaUploading` into the disabled condition:

```js
disabled={
  (!composeText.trim() && !mediaFile) ||
  posting ||
  mediaUploading ||
  (isPoll && pollOptions.filter((o) => o.label.trim() || o.file).length < 2)
}
```

(You can also allow a post that has only media and no text by using the condition above.)

---

## Quick test checklist

1. Sign in.
2. Attach a small JPG → post → see image in feed.
3. Attach a short MP4 → post → see video player.
4. Attach an MP3 → post → see audio player.
5. Try a file that is too large → you should see a clear error message.
