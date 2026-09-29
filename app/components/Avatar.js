import { initials } from '../lib/postDisplay';

// Round profile picture, falling back to initials. `className` adds size classes
// (avatar-sm, avatar-lg, comment-avatar...) exactly as the old <span className="avatar"> did.
export default function Avatar({ name, src, className = '', children }) {
  return (
    <span className={`avatar ${className}`.trim()}>
      {src ? <img src={src} alt="" className="avatar-img" /> : initials(name)}
      {children}
    </span>
  );
}
