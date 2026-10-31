'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Printer,
  Share2,
  Check,
  Copy,
  BookOpen
} from 'lucide-react';
import { verifyCertificateCode } from '../../lib/data/coursesApi';
import { CertificateCardContent } from '../../components/CourseCertificateModal';
import WatermarkShareModal from '../../components/WatermarkShareModal';

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const code = String(rawCode || '').toUpperCase();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [copiedVerify, setCopiedVerify] = useState(false);
  const [showWatermarkShare, setShowWatermarkShare] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await verifyCertificateCode(code);
        if (active) setResult(res);
      } catch {
        if (active) setResult({ valid: false, error: 'Unable to verify certificate right now.' });
      } finally {
        if (active) setLoading(false);
      }
    }
    if (code) load();
    return () => {
      active = false;
    };
  }, [code]);

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedVerify(true);
      setTimeout(() => setCopiedVerify(false), 2400);
    } catch {}
  };

  const cert = result?.certificate;
  const course = cert?.course;

  return (
    <main className="course-verify-page">
      <div className="course-verify-container">
        <div className="course-verify-topbar no-print">
          <button
            type="button"
            className="course-btn-secondary"
            onClick={() => router.push('/?section=courses')}
          >
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>
          <span className="course-verify-badge">
            <ShieldCheck size={15} /> Shammah Credential Registry
          </span>
        </div>

        {loading ? (
          <div className="course-verify-card">
            <div className="lk-skeleton" style={{ height: 320, borderRadius: 16 }} />
          </div>
        ) : result?.valid && cert ? (
          <div className="course-verify-card">
            <div className="course-verify-status-valid no-print">
              <ShieldCheck size={22} />
              <div>
                <strong>Authentic & Active Credential</strong>
                <p>
                  This certificate (Code: <code>{cert.code}</code>) was officially issued by Shammah Faith Academy.
                </p>
              </div>
              {course?.id && (
                <button
                  type="button"
                  className="course-btn-secondary"
                  onClick={() => router.push(`/courses/${course.id}`)}
                >
                  <BookOpen size={15} />
                  <span>View Course</span>
                </button>
              )}
            </div>

            <CertificateCardContent
              certificate={cert}
              course={course}
              recipientName={cert.recipient_name}
              onPrint={() => window.print()}
              onShareImage={() => setShowWatermarkShare(true)}
              onCopyVerifyLink={handleCopy}
              copiedVerify={copiedVerify}
            />
          </div>
        ) : (
          <div className="course-verify-card course-verify-invalid">
            <ShieldAlert size={40} />
            <h2>Certificate Not Found</h2>
            <p>
              We could not find an active certificate matching code <code>{code || 'UNKNOWN'}</code>. Please check the code and try again.
            </p>
            <button
              type="button"
              className="course-btn-primary"
              onClick={() => router.push('/?section=courses')}
            >
              Explore Faith Courses
            </button>
          </div>
        )}
      </div>

      {showWatermarkShare && cert && (
        <WatermarkShareModal
          post={{
            id: `cert-${cert.code}`,
            author_name: cert.recipient_name || 'Shammah Scholar',
            author_handle: 'Shammah Academy',
            content: `🎓 Verified Certificate of Completion in "${course?.title || 'Faith Foundations'}" on Shammah.\nCredential Code: ${cert.code}`,
            created_at: cert.issued_at || new Date().toISOString()
          }}
          onClose={() => setShowWatermarkShare(false)}
        />
      )}
    </main>
  );
}
