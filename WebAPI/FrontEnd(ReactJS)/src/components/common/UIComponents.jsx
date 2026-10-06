import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_MAP } from '../../domain/appTypes';

// SVG Icon Component matching prototype
export function Icon({ name = 'activity', size = 19, className = '', ...props }) {
  const getSvgPath = (iconName) => {
    switch (iconName) {
      case 'activity':
      case 'grid':
        return <path d="M22 12h-4l-3 9L9 3l-3 9H2" />;
      case 'hard-drive':
        return (
          <>
            <line x1="22" y1="12" x2="2" y2="12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            <line x1="6" y1="16" x2="6.01" y2="16" />
            <line x1="10" y1="16" x2="10.01" y2="16" />
          </>
        );
      case 'file-text':
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </>
        );
      case 'message-square':
        return <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
      case 'database':
        return (
          <>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M21 19c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14" />
            <path d="M21 5v14" />
          </>
        );
      case 'shield':
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        );
      case 'clock':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </>
        );
      case 'reset':
        return (
          <>
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </>
        );
      case 'chevron':
      case 'right':
        return <polyline points="9 18 15 12 9 6" />;
      case 'down':
        return <polyline points="6 9 12 15 18 9" />;
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </>
        );
      case 'menu':
        return (
          <>
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </>
        );
      case 'close':
      case 'x':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case 'bell':
        return (
          <>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </>
        );
      case 'logout':
        return (
          <>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </>
        );
      case 'arrow':
        return (
          <>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </>
        );
      case 'arrow-left':
        return (
          <>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </>
        );
      case 'play':
        return <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />;
      case 'plus':
        return (
          <>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </>
        );
      case 'check':
      case 'success':
        return <polyline points="20 6 9 17 4 12" />;
      case 'alert':
      case 'warning':
        return (
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );
      case 'info':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </>
        );
      case 'upload':
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </>
        );
      case 'send':
        return (
          <>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </>
        );
      case 'users':
      case 'user':
        return (
          <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        );
      case 'sliders':
      case 'filter':
        return (
          <>
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </>
        );
      case 'cpu':
        return (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" />
            <line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" />
            <line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" />
            <line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="14" x2="4" y2="14" />
          </>
        );
      case 'trending-up':
      case 'chart':
        return (
          <>
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </>
        );
      case 'external-link':
        return (
          <>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </>
        );
      case 'pin':
        return (
          <>
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z" />
          </>
        );
      case 'pin-off':
        return (
          <>
            <line x1="2" y1="2" x2="22" y2="22" />
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M9 9v1.77a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12" />
            <path d="M15 9.34V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1.34" />
          </>
        );
      default:
        return <path d="M22 12h-4l-3 9L9 3l-3 9H2" />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {getSvgPath(name)}
    </svg>
  );
}

// Prototype Logo
export function Logo({ compact = false }) {
  return (
    <span className="logo">
      <span className="logo-mark">
        <Icon name="activity" size={23} />
      </span>
      {!compact && (
        <span className="logo-text">
          CTRN <small>SHIFT N</small>
        </span>
      )}
    </span>
  );
}

// Prototype Button
export function Button({
  children,
  to,
  variant = 'primary',
  icon,
  className = '',
  loading = false,
  ...props
}) {
  const iconClassName = icon ? `icon-${icon}` : '';
  const content = (
    <>
      {icon && <Icon name={loading ? 'loader' : icon} className={loading ? 'spin' : ''} />}
      <span>{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`button ${variant} ${iconClassName} ${className}`} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={`button ${variant} ${iconClassName} ${className}`} disabled={props.disabled || loading} {...props}>
      {content}
    </button>
  );
}

// Prototype Badge
export function Badge({ status, tone, children }) {
  const defaultToneMap = {
    pending: 'orange',
    approved: 'green',
    partial: 'orange',
    changes: 'cyan',
    rejected: 'red',
    complete: 'green',
    ready: 'blue',
    invalid: 'red',
    outdated: 'red',
    processing: 'blue',
    draft: 'muted',
    high: 'red',
    medium: 'orange',
  };
  const activeTone = tone || defaultToneMap[status] || 'cyan';
  const labelText = children || STATUS_MAP[status] || status;

  return (
    <span className={`badge ${activeTone}`}>
      <i />
      {labelText}
    </span>
  );
}

// Prototype Card
export function Card({ title, subtitle, action, className = '', children, ...props }) {
  return (
    <section className={`card ${className}`} {...props}>
      {(title || action) && (
        <div className="card-heading">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Prototype Page Header
export function PageHeader({ title, subtitle, eyebrow, children }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

// Prototype Form Field
export function FormField({ label, hint, error, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {(hint || error) && (
        <small className={error ? 'field-error' : ''} role={error ? 'alert' : undefined}>
          {error || hint}
        </small>
      )}
    </label>
  );
}

// Prototype Notice
export function Notice({ children, tone = 'blue', icon = 'info', className = '' }) {
  return (
    <div className={`notice ${tone} ${className}`}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

// Prototype Empty State
export function EmptyState({ title, description, icon = 'folder', children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={34} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children && <div className="button-row">{children}</div>}
    </div>
  );
}

// Prototype Stat Widget
export function StatWidget({ title, value, note, tone = 'default', icon }) {
  return (
    <div className={`card ${tone}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{title}</span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0', color: 'var(--text)' }}>{value}</div>
          {note && <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>{note}</span>}
        </div>
        {icon && <div style={{ color: 'var(--cyan)' }}><Icon name={icon} size={24} /></div>}
      </div>
    </div>
  );
}

// Reusable Pagination Component (Phù hợp với Domain.Common.PaginationResult<T>)
export function Pagination({
  totalItems = 0,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Tính toán dãy nút trang hiển thị (hỗ trợ dấu ba chấm ...)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`pagination-container ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 18px',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        borderRadius: '0 0 12px 12px',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      {/* Thông tin số lượng hiển thị */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
        <span>
          Hiển thị <strong>{startItem} – {endItem}</strong> trong tổng số <strong>{totalItems}</strong> mục
        </span>
        {onPageSizeChange && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>Số mục:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cụm nút chuyển trang */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          style={{
            minWidth: '32px',
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: page <= 1 ? '#f8fafc' : '#ffffff',
            color: page <= 1 ? '#94a3b8' : '#334155',
            fontSize: '12px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
          title="Trang đầu"
        >
          «
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: page <= 1 ? '#f8fafc' : '#ffffff',
            color: page <= 1 ? '#94a3b8' : '#334155',
            fontSize: '12px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← Trước
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '13px' }}>
                …
              </span>
            );
          }
          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: isActive ? '#0f172a' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            height: '32px',
            padding: '0 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: page >= totalPages ? '#f8fafc' : '#ffffff',
            color: page >= totalPages ? '#94a3b8' : '#334155',
            fontSize: '12px',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Sau →
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          style={{
            minWidth: '32px',
            height: '32px',
            padding: '0 8px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: page >= totalPages ? '#f8fafc' : '#ffffff',
            color: page >= totalPages ? '#94a3b8' : '#334155',
            fontSize: '12px',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
          title="Trang cuối"
        >
          »
        </button>
      </div>
    </div>
  );
}

// Data Table có hỗ trợ phân trang thông minh
export function DataTable({
  columns = [],
  rows = [],
  empty = 'Không có dữ liệu phù hợp.',
  label = 'Bảng dữ liệu',
  paginate = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Tự động trở về trang 1 khi danh sách dữ liệu lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const displayRows = paginate
    ? rows.slice((safePage - 1) * pageSize, safePage * pageSize)
    : rows;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginate && rows.length > 0 && (
        <Pagination
          totalItems={rows.length}
          pageSize={pageSize}
          currentPage={safePage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
