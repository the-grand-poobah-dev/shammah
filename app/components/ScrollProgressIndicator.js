'use client';
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

export default function ScrollProgressIndicator() {
  const [progress, setProgress] = useState(0);
  const [activeReadingTitle, setActiveReadingTitle] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let hideTimer = null;

    function calculateProgress() {
      // 1. Check if an active reading modal or focused article reader exists
      const modalArticle = document.querySelector('.article-modal-scroll, .reader-modal-body, .article-reading-body');
      if (modalArticle) {
        const scrollTop = modalArticle.scrollTop;
        const scrollHeight = modalArticle.scrollHeight - modalArticle.clientHeight;
        if (scrollHeight > 20) {
          const pct = Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100)));
          setProgress(pct);
          setIsVisible(true);
          setActiveReadingTitle(modalArticle.getAttribute('data-article-title') || 'Article');
          return;
        }
      }

      // 2. Check if user is scrolling through an expanded long post or article in the feed
      const expandedArticles = document.querySelectorAll('.post-card.is-expanded, .post-text.expanded, .article-reading-target, article.is-reading');
      let targetArticle = null;
      const windowH = window.innerHeight;

      for (const el of expandedArticles) {
        const rect = el.getBoundingClientRect();
        // If element is taking substantial vertical screen space
        if (rect.top <= windowH * 0.7 && rect.bottom >= windowH * 0.2) {
          targetArticle = el;
          break;
        }
      }

      if (targetArticle) {
        const rect = targetArticle.getBoundingClientRect();
        const totalHeight = rect.height;
        const scrolledPastTop = Math.max(0, -rect.top + 100);
        const pct = Math.min(100, Math.max(0, Math.round((scrolledPastTop / (totalHeight - windowH * 0.4)) * 100)));
        setProgress(pct);
        setIsVisible(true);
        setActiveReadingTitle(targetArticle.getAttribute('data-article-title') || 'Long Post');
        return;
      }

      // 3. Fallback: Check general page scroll if window has article/long content (> 900px scrollable)
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY || window.pageYOffset || 0;
      
      // Check if current view is on an article or long post route or section
      const isArticleView = Boolean(
        document.querySelector('.post-text-container.expanded') ||
        document.querySelector('.rss-mixed-card') ||
        document.querySelector('.bible-chapter-card') ||
        window.location.search.includes('section=bible') ||
        window.location.search.includes('section=articles') ||
        window.location.pathname.includes('/articles')
      );

      if (isArticleView && docHeight > 400 && currentScroll > 60) {
        const pct = Math.min(100, Math.max(0, Math.round((currentScroll / docHeight) * 100)));
        setProgress(pct);
        setIsVisible(true);
        setActiveReadingTitle('Article / Long Post');
      } else if (currentScroll > 150 && docHeight > 1000) {
        // Subtle feed scroll indicator
        const pct = Math.min(100, Math.max(0, Math.round((currentScroll / docHeight) * 100)));
        setProgress(pct);
        setIsVisible(true);
        setActiveReadingTitle('');
      } else {
        setIsVisible(false);
      }
    }

    function onScroll() {
      calculateProgress();
    }

    function onCustomProgress(e) {
      if (e.detail?.progress != null) {
        setProgress(Math.min(100, Math.max(0, Math.round(e.detail.progress))));
        setIsVisible(true);
        if (e.detail.title) setActiveReadingTitle(e.detail.title);
        clearTimeout(hideTimer);
        if (e.detail.autoHide) {
          hideTimer = setTimeout(() => setIsVisible(false), 2500);
        }
      } else if (e.detail?.active === false) {
        setIsVisible(false);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('shammah:reading-progress', onCustomProgress);
    
    // Initial check
    calculateProgress();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('shammah:reading-progress', onCustomProgress);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      className={`reading-progress-container${isVisible ? ' visible' : ''}`}
      aria-hidden="true"
    >
      {/* Top Gradient Progress Bar */}
      <div
        className="reading-progress-bar"
        style={{ width: `${progress}%` }}
      />

      {/* Floating Reading Pill */}
      {isVisible && progress > 0 && activeReadingTitle && (
        <div className="reading-progress-pill">
          <BookOpen size={11} className="reading-progress-icon" />
          <span className="reading-progress-text">
            {activeReadingTitle}: <strong>{progress}%</strong>
          </span>
        </div>
      )}
    </div>
  );
}
