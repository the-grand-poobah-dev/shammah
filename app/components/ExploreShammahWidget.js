'use client';
import { useState, useEffect, useRef, useId } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Pencil,
  Check,
  Plus,
  X,
  GripVertical,
  RotateCcw,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';
import {
  DEFAULT_SHORTCUTS,
  ICON_MAP,
  COLOR_SWATCHES,
  DESTINATION_GROUPS,
  loadShortcuts,
  saveShortcuts,
  resetShortcuts,
  runShortcut,
  isValidExternalUrl,
} from '../lib/shortcutsManager';
import { useSession } from '../../lib/useSession';
import { useLayoutMode } from '../lib/useLayoutMode';
import { playSound } from '../lib/soundEffects';
import PopupSheet from './PopupSheet';

export default function ExploreShammahWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();
  const layoutMode = useLayoutMode();
  const isTablet = layoutMode === 'tablet';

  const userId = session?.user?.id || 'guest';
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [isEditing, setIsEditing] = useState(false);
  const [tabletPopoverOpen, setTabletPopoverOpen] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null = adding new
  const [editorData, setEditorData] = useState({
    id: '',
    label: '',
    icon: 'Sparkles',
    color: '#06b6d4',
    size: 'sm',
    target: { type: 'section', value: 'bible' },
  });
  const [editorUrlError, setEditorUrlError] = useState('');

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const popoverRef = useRef(null);
  const announceTimerRef = useRef(null);

  // Load shortcuts from localStorage after mount to match SSR default
  useEffect(() => {
    const loaded = loadShortcuts(userId);
    setShortcuts(loaded);
  }, [userId]);

  // Close tablet popover on route change
  useEffect(() => {
    setTabletPopoverOpen(false);
  }, [pathname]);

  // Handle tablet popover outside click, Escape, and open-panel event
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setTabletPopoverOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape' && tabletPopoverOpen) {
        setTabletPopoverOpen(false);
      }
    }
    function handleOpenPanel() {
      setTabletPopoverOpen(false);
    }

    if (tabletPopoverOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    window.addEventListener('shammah:open-panel', handleOpenPanel);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('shammah:open-panel', handleOpenPanel);
    };
  }, [tabletPopoverOpen]);

  function announce(msg) {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    setLiveAnnouncement(msg);
    announceTimerRef.current = setTimeout(() => setLiveAnnouncement(''), 4000);
  }

  function handleTileClick(shortcut, index) {
    if (isEditing) {
      openEditorForEdit(index);
      return;
    }
    runShortcut(shortcut, { router, pathname });
    if (isTablet) {
      setTabletPopoverOpen(false);
    }
  }

  function handleDeleteTile(e, index) {
    e.stopPropagation();
    playSound('reaction');
    const targetItem = shortcuts[index];
    const nextList = shortcuts.filter((_, i) => i !== index);
    setShortcuts(nextList);
    saveShortcuts(userId, nextList);
    announce(`Removed shortcut: ${targetItem?.label || 'Item'}`);
  }

  function handleResetDefaults() {
    playSound('reaction');
    if (window.confirm('Reset shortcuts to default tableau?')) {
      const defs = resetShortcuts(userId);
      setShortcuts(defs);
      announce('Reset all shortcuts to defaults');
    }
  }

  // HTML5 Drag & Drop Handlers
  function handleDragStart(e, index) {
    if (!isEditing) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${index}`);
  }

  function handleDragOver(e, index) {
    if (!isEditing || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(e, targetIndex) {
    if (!isEditing || draggedIndex === null) return;
    e.preventDefault();

    if (draggedIndex !== targetIndex) {
      const updated = [...shortcuts];
      const [removed] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, removed);
      setShortcuts(updated);
      saveShortcuts(userId, updated);
      announce(`Moved ${removed.label} to position ${targetIndex + 1}`);
      playSound('reaction');
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  // Keyboard reordering: Alt + Arrow keys
  function handleTileKeyDown(e, index) {
    if (!isEditing) return;

    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      if (index > 0) {
        const targetIndex = index - 1;
        const updated = [...shortcuts];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        setShortcuts(updated);
        saveShortcuts(userId, updated);
        playSound('reaction');
        announce(`Moved ${moved.label} to position ${targetIndex + 1} of ${shortcuts.length}`);
      }
    } else if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (index < shortcuts.length - 1) {
        const targetIndex = index + 1;
        const updated = [...shortcuts];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        setShortcuts(updated);
        saveShortcuts(userId, updated);
        playSound('reaction');
        announce(`Moved ${moved.label} to position ${targetIndex + 1} of ${shortcuts.length}`);
      }
    }
  }

  // Open Editor Modal for New Item
  function openEditorForAdd() {
    playSound('reaction');
    setEditingIndex(null);
    setEditorData({
      id: `shortcut-${Date.now()}`,
      label: '',
      icon: 'Sparkles',
      color: '#06b6d4',
      size: 'sm',
      target: { type: 'section', value: 'bible' },
    });
    setEditorUrlError('');
    setIsEditorOpen(true);
  }

  // Open Editor Modal for Existing Item
  function openEditorForEdit(index) {
    playSound('reaction');
    const item = shortcuts[index];
    if (!item) return;

    setEditingIndex(index);
    setEditorData({
      id: item.id || `shortcut-${Date.now()}`,
      label: item.label,
      icon: item.icon,
      color: item.color,
      size: item.size || 'sm',
      target: {
        type: item.target?.type || 'section',
        value: item.target?.value || 'bible',
      },
    });
    setEditorUrlError('');
    setIsEditorOpen(true);
  }

  function handleSaveEditor() {
    const trimmedLabel = editorData.label.trim().slice(0, 18);
    if (!trimmedLabel) return;

    if (editorData.target.type === 'external') {
      if (!isValidExternalUrl(editorData.target.value)) {
        setEditorUrlError('Please enter a valid URL starting with http:// or https://');
        return;
      }
    }

    playSound('reaction');
    const finalItem = {
      ...editorData,
      label: trimmedLabel,
    };

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...shortcuts];
      updatedList[editingIndex] = finalItem;
      announce(`Saved changes to ${trimmedLabel}`);
    } else {
      updatedList = [...shortcuts, finalItem].slice(0, 12);
      announce(`Added new shortcut ${trimmedLabel}`);
    }

    setShortcuts(updatedList);
    saveShortcuts(userId, updatedList);
    setIsEditorOpen(false);
  }

  // Preview Tile Icon component
  const PreviewIconComponent = ICON_MAP[editorData.icon] || Sparkles;

  // Render Tableau Content (used both on Desktop inline and Tablet in popover)
  const renderTableauBody = () => (
    <div className="dl-tableau-container">
      {/* Aria-live region for reorder feedback */}
      <div aria-live="polite" className="dl-sr-only">
        {liveAnnouncement}
      </div>

      {/* Tableau Header */}
      <div className="dl-tableau-header">
        <div className="dl-tableau-title-wrap">
          <Sparkles size={14} className="dl-tableau-title-icon" />
          <span className="dl-tableau-title">Explore Shammah</span>
        </div>
        <button
          type="button"
          className={`dl-tableau-edit-toggle${isEditing ? ' active' : ''}`}
          onClick={() => {
            playSound('reaction');
            setIsEditing(!isEditing);
          }}
          aria-label={isEditing ? 'Done editing shortcuts' : 'Edit shortcuts'}
          title={isEditing ? 'Finish customizing' : 'Customize shortcuts'}
        >
          {isEditing ? <Check size={14} /> : <Pencil size={13} />}
          <span className="dl-edit-text">{isEditing ? 'Done' : 'Edit'}</span>
        </button>
      </div>

      {/* Tableau Grid */}
      {shortcuts.length > 0 ? (
        <div className="dl-tableau-grid" role="list">
          {shortcuts.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] || Sparkles;
            const isWide = item.size === 'wide';
            const isDragging = draggedIndex === idx;
            const isOver = dragOverIndex === idx;

            return (
              <div
                key={item.id || idx}
                className={`dl-tableau-tile-wrap ${isWide ? 'wide' : 'sm'}${
                  isDragging ? ' is-dragging' : ''
                }${isOver ? ' is-drag-over' : ''}`}
                role="listitem"
                draggable={isEditing}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              >
                <button
                  type="button"
                  className={`dl-tableau-tile${isEditing ? ' is-editing' : ''}`}
                  style={{
                    '--sec-color': item.color,
                  }}
                  onClick={() => handleTileClick(item, idx)}
                  onKeyDown={(e) => handleTileKeyDown(e, idx)}
                  title={
                    isEditing
                      ? `Click to edit ${item.label}. (Drag to reorder, or press Alt+Arrows)`
                      : `Open ${item.label}`
                  }
                  aria-label={
                    isEditing
                      ? `${item.label}, press Alt+Arrows to reorder, or Enter to edit`
                      : item.label
                  }
                >
                  {/* Edit Controls */}
                  {isEditing && (
                    <>
                      <span className="dl-tile-drag-handle" title="Drag to reorder" aria-hidden="true">
                        <GripVertical size={13} />
                      </span>
                      <button
                        type="button"
                        className="dl-tile-delete-btn"
                        onClick={(e) => handleDeleteTile(e, idx)}
                        aria-label={`Delete ${item.label}`}
                        title="Delete shortcut"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}

                  {/* Tile Icon and Content */}
                  <div className="dl-tile-body">
                    <span className="dl-tile-icon-box" aria-hidden="true">
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <div className="dl-tile-text-wrap">
                      <span className="dl-tile-label">{item.label}</span>
                      {isWide && item.target?.type === 'external' && (
                        <span className="dl-tile-subtext">
                          <ExternalLink size={10} style={{ display: 'inline', marginRight: 3 }} />
                          Website
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}

          {/* Add Shortcut Tile (visible in edit mode, max 12 items) */}
          {isEditing && shortcuts.length < 12 && (
            <div className="dl-tableau-tile-wrap sm">
              <button
                type="button"
                className="dl-tableau-add-tile"
                onClick={openEditorForAdd}
                aria-label="Add new shortcut"
                title="Add new shortcut"
              >
                <Plus size={18} />
                <span>Add tile</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="dl-tableau-empty-state">
          <p className="dl-empty-desc">No shortcuts pinned to your tableau.</p>
          <button
            type="button"
            className="dl-restore-btn"
            onClick={handleResetDefaults}
          >
            <RotateCcw size={13} />
            <span>Restore defaults</span>
          </button>
        </div>
      )}

      {/* Edit Mode Footer Controls */}
      {isEditing && shortcuts.length > 0 && (
        <div className="dl-tableau-edit-footer">
          <button
            type="button"
            className="dl-reset-text-btn"
            onClick={handleResetDefaults}
          >
            <RotateCcw size={12} />
            <span>Reset to defaults</span>
          </button>
          <span className="dl-tile-counter">{shortcuts.length}/12 tiles</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* TABLET VIEWPORT (768px - 1099px): Single Icon Button with Popover */}
      {isTablet ? (
        <div className="dl-tablet-widget-anchor" ref={popoverRef}>
          <button
            type="button"
            className={`dl-nav-item dl-tablet-explore-btn${tabletPopoverOpen ? ' active' : ''}`}
            onClick={() => {
              playSound('reaction');
              setTabletPopoverOpen(!tabletPopoverOpen);
            }}
            aria-label="Explore Shammah"
            title="Explore Shammah shortcuts"
            style={{
              '--sec-color': '#06b6d4',
              '--sec-complement': '#10b981',
            }}
          >
            <span className="dl-icon-wrap" aria-hidden="true">
              <LayoutGrid size={20} strokeWidth={tabletPopoverOpen ? 2.4 : 1.8} className="dl-nav-icon" />
            </span>
            <span className="dl-rail-tooltip" role="tooltip">Shortcuts</span>
          </button>

          {/* Tablet Popover anchored to the right of the 72px rail */}
          {tabletPopoverOpen && (
            <div className="dl-tablet-tableau-popover neon-glow-modal" role="dialog" aria-label="Explore Shammah Tableau">
              {renderTableauBody()}
            </div>
          )}
        </div>
      ) : (
        /* DESKTOP VIEWPORT (>= 1100px): Inline Tableau */
        <div className="dl-desktop-widget-wrap">
          {renderTableauBody()}
        </div>
      )}

      {/* SHORTCUT EDITOR MODAL (PopupSheet) */}
      <PopupSheet
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingIndex !== null ? 'Edit Shortcut Tile' : 'Add Shortcut Tile'}
        size="md"
        footer={
          <div className="dl-editor-footer-actions">
            <button
              type="button"
              className="dl-modal-btn cancel"
              onClick={() => setIsEditorOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dl-modal-btn save"
              disabled={!editorData.label.trim() || (editorData.target.type === 'external' && !editorData.target.value)}
              onClick={handleSaveEditor}
            >
              Save Shortcut
            </button>
          </div>
        }
      >
        <div className="dl-shortcut-editor-form">
          {/* Live Preview Box */}
          <div className="dl-editor-preview-container">
            <span className="dl-editor-field-label">Live Preview</span>
            <div className="dl-editor-preview-stage">
              <div
                className={`dl-tableau-tile-wrap ${editorData.size}`}
                style={{ maxWidth: editorData.size === 'wide' ? 240 : 120 }}
              >
                <div
                  className="dl-tableau-tile"
                  style={{
                    '--sec-color': editorData.color,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="dl-tile-body">
                    <span className="dl-tile-icon-box">
                      <PreviewIconComponent size={18} strokeWidth={2} />
                    </span>
                    <div className="dl-tile-text-wrap">
                      <span className="dl-tile-label">
                        {editorData.label.trim() || 'Shortcut Name'}
                      </span>
                      {editorData.size === 'wide' && (
                        <span className="dl-tile-subtext">Preview</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Field: Label */}
          <div className="dl-editor-field">
            <div className="dl-field-header">
              <label htmlFor="shortcut-label-input" className="dl-editor-field-label">
                Label <span className="dl-required">*</span>
              </label>
              <span className="dl-char-count">{editorData.label.length}/18</span>
            </div>
            <input
              id="shortcut-label-input"
              type="text"
              maxLength={18}
              className="dl-editor-text-input"
              placeholder="e.g. Daily Verse, Bible"
              value={editorData.label}
              onChange={(e) => setEditorData({ ...editorData, label: e.target.value })}
              autoFocus
            />
          </div>

          {/* Field: Tile Size */}
          <div className="dl-editor-field">
            <label className="dl-editor-field-label">Tile Size</label>
            <div className="dl-size-segmented-control" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={editorData.size === 'sm'}
                className={`dl-segment-btn${editorData.size === 'sm' ? ' active' : ''}`}
                onClick={() => setEditorData({ ...editorData, size: 'sm' })}
              >
                Small (1 Column)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={editorData.size === 'wide'}
                className={`dl-segment-btn${editorData.size === 'wide' ? ' active' : ''}`}
                onClick={() => setEditorData({ ...editorData, size: 'wide' })}
              >
                Wide (2 Columns)
              </button>
            </div>
          </div>

          {/* Field: Icon Selection */}
          <div className="dl-editor-field">
            <label className="dl-editor-field-label">Icon</label>
            <div className="dl-icon-grid" role="radiogroup">
              {Object.keys(ICON_MAP).map((iconKey) => {
                const ItemIcon = ICON_MAP[iconKey];
                const isSelected = editorData.icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`dl-icon-choice-btn${isSelected ? ' selected' : ''}`}
                    onClick={() => {
                      playSound('reaction');
                      setEditorData({ ...editorData, icon: iconKey });
                    }}
                    title={iconKey}
                  >
                    <ItemIcon size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field: Color Swatches */}
          <div className="dl-editor-field">
            <label className="dl-editor-field-label">Tile Accent Color</label>
            <div className="dl-color-swatches-row">
              {COLOR_SWATCHES.map((hex) => {
                const isSelected = editorData.color.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    className={`dl-color-swatch-btn${isSelected ? ' selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => {
                      playSound('reaction');
                      setEditorData({ ...editorData, color: hex });
                    }}
                    aria-label={`Select color ${hex}`}
                    title={hex}
                  >
                    {isSelected && <Check size={14} className="dl-swatch-check" />}
                  </button>
                );
              })}
              <div className="dl-custom-color-wrap">
                <input
                  type="color"
                  className="dl-color-picker-input"
                  value={editorData.color}
                  onChange={(e) => setEditorData({ ...editorData, color: e.target.value })}
                  title="Custom hex color"
                />
              </div>
            </div>
          </div>

          {/* Field: Destination Type & Target */}
          <div className="dl-editor-field">
            <label className="dl-editor-field-label">Destination Type</label>
            <div className="dl-destination-type-tabs">
              {DESTINATION_GROUPS.map((group) => {
                const isSelected = editorData.target.type === group.type;
                return (
                  <button
                    key={group.type}
                    type="button"
                    className={`dl-dest-tab${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      playSound('reaction');
                      const firstOption = group.options[0]?.value || '';
                      setEditorData({
                        ...editorData,
                        target: {
                          type: group.type,
                          value: group.type === 'external' ? 'https://' : firstOption,
                        },
                      });
                      setEditorUrlError('');
                    }}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>

            {/* Target Select / Input based on Type */}
            <div className="dl-destination-input-wrap">
              {editorData.target.type === 'external' ? (
                <div>
                  <input
                    type="url"
                    className="dl-editor-text-input"
                    placeholder="https://example.com"
                    value={editorData.target.value}
                    onChange={(e) => {
                      setEditorData({
                        ...editorData,
                        target: { type: 'external', value: e.target.value },
                      });
                      setEditorUrlError('');
                    }}
                  />
                  {editorUrlError && <p className="dl-error-msg">{editorUrlError}</p>}
                </div>
              ) : (
                <select
                  className="dl-editor-select"
                  value={editorData.target.value}
                  onChange={(e) =>
                    setEditorData({
                      ...editorData,
                      target: { ...editorData.target, value: e.target.value },
                    })
                  }
                >
                  {DESTINATION_GROUPS.find((g) => g.type === editorData.target.type)?.options.map(
                    (opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    )
                  )}
                </select>
              )}
            </div>
          </div>
        </div>
      </PopupSheet>
    </>
  );
}
