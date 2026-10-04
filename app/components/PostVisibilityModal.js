'use client';
import { useState } from 'react';
import { Shield, X, Check, Globe, Users, Church, Lock } from 'lucide-react';
import { VISIBILITY_OPTIONS, setPostVisibility, batchSetAllPostsVisibility } from '../lib/postInteractions';

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
  onClose,
  onUpdated,
}) {
  const [selected, setSelected] = useState(currentVisibility);
  const [applyToAll, setApplyToAll] = useState(false);

  async function handleSave() {
    if (postId) {
      await setPostVisibility(postId, selected);
    }
    if (applyToAll) {
      await batchSetAllPostsVisibility(currentUser?.id, selected, allPostIds);
    }
    if (onUpdated) onUpdated(selected, applyToAll);
    onClose();
  }

  return (
    <div className="visibility-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="visibility-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="visibility-modal-header">
          <div className="visibility-modal-title">
            <Shield size={18} className="vis-icon-shield" />
            <h3>Post Visibility &amp; Privacy</h3>
          </div>
          <button type="button" className="visibility-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="visibility-desc">
          Choose who can see this fellowship post on Shammah:
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

        <div className="visibility-modal-actions">
          <button type="button" className="vis-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="vis-save-btn" onClick={handleSave}>
            Save Privacy Setting
          </button>
        </div>
      </div>
    </div>
  );
}
