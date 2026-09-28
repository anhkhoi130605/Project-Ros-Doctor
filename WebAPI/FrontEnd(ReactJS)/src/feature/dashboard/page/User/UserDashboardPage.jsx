import React from 'react';
import DashboardPage from '../DashboardPage';
import UserStatWidget from './components/UserStatWidget';
import UserInfoCard from './components/UserInfoCard';

const widgets = [
  { label: 'Courses', value: '24', tone: 'green', detail: 'New updates' },
  { label: 'Weekly Activity', value: '12', tone: 'blue', detail: 'in 7 days' },
  { label: 'Achievement', value: '86%', tone: 'amber', detail: 'completion rate' },
  { label: 'Following', value: '8', tone: 'purple', detail: 'personal goals' },
];

const cards = [
  { title: 'Schedule', detail: '3 upcoming events' },
  { title: 'Tasks', detail: '2 tasks not completed yet' },
  { title: 'Connections', detail: '4 new friends' },
];

export default function UserDashboardPage() {
  return (
    <DashboardPage
      title="User Dashboard"
      subtitle="Personal control panel"
      sidebarTitle="USER AREA"
      navItems={[
        { label: 'Overview', active: true, icon: '◈' },
        { label: 'Courses', icon: '▣' },
        { label: 'Schedule', icon: '◫' },
        { label: 'Profile', icon: '◎' },
      ]}
      actions={<button type="button" className="dashboard-ghost-button">View profile</button>}
    >
      <div className="dashboard-grid dashboard-grid-4">
        {widgets.map((item) => (
          <UserStatWidget key={item.label} {...item} />
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid-3">
        {cards.map((item) => (
          <UserInfoCard key={item.title} {...item} />
        ))}
      </div>
    </DashboardPage>
  );
}
