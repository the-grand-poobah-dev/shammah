'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Printer,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Calendar
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import WatermarkShareModal from './WatermarkShareModal';

export function CertificateCardContent({
  certificate,
  course,
  recipientName,
  onPrint,
  onShareImage,
  onCopyVerifyLink,
  copiedVerify
}) {
  const code = certificate?.code || 'SHM-FAITH-2026';
  const issuedDate = certificate?.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  const accent = course?.accent || '#f59e0b';
  const finalRecipient =
    recipientName ||
    certificate?.recipient_name ||
    'Faithful Shammah Scholar';
  const courseTitle = course?.title || certificate?.course?.title || 'Foundations of Faith';
  const instructorName =
    course?.instructor_name ||
    course?.instructor ||
    certificate?.course?.instructor_name ||
    'Pastor David M.';
  const instructorRole =
    course?.instructor_role ||
    course?.role ||
    certificate?.course?.instructor_role ||
    'Senior Teaching Pastor';
  const verifyPath = `/verify/${code}`;

  return (
    <div className="course-cert-wrapper">
      <div
        className="course-cert-sheet"
        style={{ '--sec-color': accent }}
        id="shammah-printable-certificate"
      >
        <div className="course-cert-ornament-top" />
        <div className="course-cert-header">
          <div className="course-cert-seal">
            <Award size={28} />
          </div>
          <div>
            <span className="course-cert-academy">SHAMMAH FAITH ACADEMY</span>
            <h3 className="course-cert-heading">Certificate of Completion</h3>
          </div>
          <div className="course-cert-verified-pill">
            <ShieldCheck size={14} />
            <span>Verified Credential</span>
          </div>
        </div>

        <div className="course-cert-body">
          <p className="course-cert-presented-label">THIS IS PROUDLY PRESENTED TO</p>
          <h2 className="course-cert-recipient">{finalRecipient}</h2>
          <p className="course-cert-reason">
            for faithfully completing all modules, lessons, and mastery assessments in the course
          </p>
          <h4 className="course-cert-course-title">{courseTitle}</h4>

          <div className="course-cert-meta-row">
            <span className="course-cert-meta-chip">
              <BookOpen size={13} />
              {course?.category || certificate?.course?.category || 'Biblical Studies'}
            </span>
            <span className="course-cert-meta-chip">
              <Sparkles size={13} />
              {course?.level || certificate?.course?.level || 'All Levels'}
            </span>
            <span className="course-cert-meta-chip">
              <Calendar size={13} />
              {issuedDate}
            </span>
          </div>
        </div>

        <div className="course-cert-footer">
          <div className="course-cert-sig-block">
            <div className="course-cert-sig-script">{instructorName}</div>
            <div className="course-cert-sig-line" />
            <span className="course-cert-sig-role">{instructorRole}</span>
          </div>

          <div className="course-cert-code-box">
            <span className="course-cert-code-label">VERIFICATION CODE</span>
            <strong className="course-cert-code-value">{code}</strong>
            <a
              href={verifyPath}
              target="_blank"
              rel="noopener noreferrer"
              className="course-cert-verify-url"
            >
              Verify at {verifyPath} <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      <div className="course-cert-actions no-print">
        {onPrint && (
          <button
            type="button"
            className="course-btn-primary"
            onClick={onPrint}
            aria-label="Print or Save Certificate as PDF"
          >
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        )}
        {onShareImage && (
          <button
            type="button"
            className="course-btn-secondary"
            onClick={onShareImage}
            aria-label="Share Certificate as Watermarked Image"
          >
            <Share2 size={16} />
            <span>Share Image Card</span>
          </button>
        )}
        {onCopyVerifyLink && (
          <button
            type="button"
            className="course-btn-secondary"
            onClick={onCopyVerifyLink}
            aria-label="Copy Verification URL"
          >
            {copiedVerify ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedVerify ? 'Verification Link Copied' : 'Copy Verify Link'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function CourseCertificateModal({
  isOpen,
  onClose,
  certificate,
  course,
  recipientName
}) {
  const [copiedVerify, setCopiedVerify] = useState(false);
  const [showWatermarkShare, setShowWatermarkShare] = useState(false);

  if (!isOpen || !certificate) return null;

  const code = certificate.code || 'SHM-FAITH-2026';
  const finalRecipient =
    recipientName ||
    certificate.recipient_name ||
    'Faithful Shammah Scholar';
  const courseTitle = course?.title || certificate?.course?.title || 'Foundations of Faith';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyVerify = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/verify/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedVerify(true);
      setTimeout(() => setCopiedVerify(false), 2400);
    } catch {}
  };

  const sharePostPayload = {
    id: `cert-${code}`,
    author_name: finalRecipient,
    author_handle: 'Shammah Academy',
    content: `🎓 Praise God! I just earned my verified Certificate of Completion in "${courseTitle}" on Shammah Faith Academy.\n\nCredential Code: ${code}\nVerify at: /verify/${code}`,
    created_at: certificate.issued_at || new Date().toISOString()
  };

  return (
    <>
      <PopupSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Course Certificate"
        maxWidth="680px"
      >
        <div className="course-cert-modal-body">
          <div className="course-cert-congrats-banner">
            <CheckCircle2 size={18} />
            <span>
              Congratulations! Your credential is permanently recorded and publicly verifiable.
            </span>
          </div>

          <CertificateCardContent
            certificate={certificate}
            course={course}
            recipientName={finalRecipient}
            onPrint={handlePrint}
            onShareImage={() => setShowWatermarkShare(true)}
            onCopyVerifyLink={handleCopyVerify}
            copiedVerify={copiedVerify}
          />
        </div>
      </PopupSheet>

      {showWatermarkShare && (
        <WatermarkShareModal
          post={sharePostPayload}
          onClose={() => setShowWatermarkShare(false)}
        />
      )}
    </>
  );
}
