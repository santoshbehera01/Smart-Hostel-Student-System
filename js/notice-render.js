// Shared HTML builder for a single notice card.
// Used by: Admin Dashboard notice list, public Notice Board, Home page preview.

export function formatNoticeDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/**
 * @param {object} n    notice: { title, body, pdfUrl, createdAt }
 * @param {object} opts { hostelLabel: string|null, footerHtml: string }
 */
export function renderNoticeCard(n, opts = {}){
  const dateStr = formatNoticeDate(n.createdAt);
  const hasPdf = !!n.pdfUrl;

  const titleHtml = hasPdf
    ? `<a href="${n.pdfUrl}" target="_blank" rel="noopener" class="notice-title-link">
         <span class="notice-arrow">»</span> ${escapeHtml(n.title)} <span class="notice-pdf-badge">📄 PDF</span>
       </a>`
    : `<div class="notice-title-plain"><span class="notice-arrow">»</span> ${escapeHtml(n.title)}</div>
       ${n.body ? `<p class="notice-desc">${escapeHtml(n.body)}</p>` : ''}`;

  const hostelTagHtml = opts.hostelLabel
    ? `<span class="notice-hostel-tag">For: ${escapeHtml(opts.hostelLabel)}</span>` : '';

  return `
    <div class="notice-item-v2">
      ${titleHtml}
      <div class="notice-meta-row">
        <span class="notice-date"><span class="notice-cal-icon">📅</span> On ${dateStr}</span>
        ${hostelTagHtml}
      </div>
      ${opts.footerHtml || ''}
    </div>
  `;
}