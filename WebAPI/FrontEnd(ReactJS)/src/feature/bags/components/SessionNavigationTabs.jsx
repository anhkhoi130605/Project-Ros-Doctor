import React from 'react';
import { Link } from 'react-router-dom';

const SESSION_TABS = [
  { id: 'overview', label: 'Tổng quan phiên', path: '/overview' },
  { id: 'topics', label: 'Topics & Timeline', path: '/topics' },
  { id: 'issues', label: 'Sự cố & Chẩn đoán', path: '/issues', screen: 'E10' },
  { id: 'tf', label: 'Cây TF', path: '/tf', badge: '3D' },
  { id: 'sync', label: 'Đồng bộ thời gian', path: '/sync', screen: 'E13' },
  { id: 'agent', label: 'Agent & đề xuất', path: '/agent', screen: 'E14' },
];

export default function SessionNavigationTabs({ sessionId, activeTab, notify }) {
  const handleUnavailableTab = (event, tab) => {
    if (!tab.screen) return;
    event.preventDefault();
    notify?.(`Màn ${tab.screen} sẽ được hoàn thiện ở phần tiếp theo.`, 'info');
  };

  return (
    <nav className="tabs" aria-label="Điều hướng phiên phân tích">
      {SESSION_TABS.map((tab) => (
        <Link
          key={tab.id}
          to={`/sessions/${sessionId}${tab.path}`}
          className={activeTab === tab.id ? 'active' : ''}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          onClick={(event) => handleUnavailableTab(event, tab)}
        >
          {tab.label}
          {tab.badge && <span className="tab-mini">{tab.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
