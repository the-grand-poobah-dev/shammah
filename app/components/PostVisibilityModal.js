'use client';
import { useState } from 'react';
import { Shield, Check, Globe, Users, Church, Lock } from 'lucide-react';
import PopupSheet from './PopupSheet';
import { VISIBILITY_OPTIONS, setPostVisibility, batchSetAllPostsVisibility } from '../lib/postInteractions';
import { updateUserCreatedPost } from '../lib/pinnedPosts';

const VIS_ICONS = {
  public: Globe,
  followers: Users,
  church: Church,
  private: Lock,
};

export default function PostVisibilityModal({
  postId = null,
  currentVisibility = 'public',
  currentUser,
  allPostIds = [],
  open = true,
  onClose,
  onUpdated,
}) {
  const [selected, setSelected] = useState(currentVisibility);
  const [applyToAll, setApplyToAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      if (postId) {
        await setPostVisibility(postId, selected);
        updateUserCreatedPost(postId, { visibility: selected });
      }
      if (applyToAll) {
        await batchSetAllPostsVisibility(currentUser?.id, selected, allPostIds);
      }
      if (onUpdated) onUpdated(selected, applyToAll);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  const modalTitle = (
    <div className="visibility-modal-title">
      <Shield size={18} className="vis-icon-shield" />
      <span>Post Visibility &amp; Privacy</span>
    </div>
  );

  const modalFooter = (
    <div className="visibility-modal-actions">
      <button
        type="button"
        className="vis-cancel-btn"
        onClick={onClose}
        disabled={isSaving}
      >
        Cancel
      </button>
      <button
        type="button"
        className="vis-save-btn"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Privacy Setting'}
      </button>
    </div>
  );

  return (
    <PopupSheet
      open={open}
      onClose={onClose}
      title={modalTitle}
      size="md"
      footer={modalFooter}
    >
      <p className="visibility-desc">
        Choose who can see this post on Shammah:
      </p>

      <div className="visibility-options-list">
        {VISIBILITY_OPTIONS.map((opt) => {
          const Icon = VIS_ICONS[opt.id] || Globe;
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`visibility-option-item${isSelected ? ' active' : ''}`}
              onClick={() => setSelected(opt.id)}
            >
              <div className="vis-option-left">
                <span className="vis-option-icon">
                  <Icon size={18} />
                </span>
                <div className="vis-option-text">
                  <span className="vis-option-label">{opt.label}</span>
                  <span className="vis-option-sub">{opt.desc}</span>
                </div>
              </div>
              {isSelected && <Check size={18} className="vis-check-icon" />}
            </button>
          );
        })}
      </div>

      {/* Batch update option */}
      <label className="visibility-batch-checkbox-row">
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.target.checked)}
          className="vis-batch-input"
        />
        <span className="vis-batch-label">
          Apply this privacy setting to all of my past and present posts
        </span>
      </label>
    </PopupSheet>
  );
}
