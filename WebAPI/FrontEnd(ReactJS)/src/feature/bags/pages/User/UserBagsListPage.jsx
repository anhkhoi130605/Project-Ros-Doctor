import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Badge, Button, Icon } from '../../../../components/common/UIComponents';
import useUserBags from './hook/useUserBags';
import UserBagStatCard from './components/UserBagStatCard';
import UserSharedBagCard from './components/UserSharedBagCard';

export default function UserBagsListPage() {
  const { filteredBags, sharedBags, searchTerm, setSearchTerm } = useUserBags();

  const totalSizeMb = sharedBags.reduce((acc, b) => acc + (b.sizeMb || 0), 0);

  return (
    <div className="bags-page user-bags-page" style={{ display: 'grid', gap: '24px' }}>
      <PageHeader
        eyebrow="USER · CHỈ XEM"
        title="Rosbag được chia sẻ"
        subtitle="Danh sách các bản ghi log và phiên chẩn đoán đã được kỹ sư kiểm tra, công bố."
      >
        <Button to="/bag-submissions" icon="upload">Gửi rosbag & theo dõi</Button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <UserBagStatCard
          title="Bản ghi công bố"
          value={sharedBags.length}
          note="Sẵn sàng quan sát"
          icon="database"
          tone="cyan"
        />
        <UserBagStatCard
          title="Tổng dung lượng"
          value={`${totalSizeMb} MB`}
          note="Đã lưu trữ"
          icon="hard-drive"
          tone="blue"
        />
        <UserBagStatCard
          title="Phiên chẩn đoán"
          value={sharedBags.filter((b) => b.sessionId).length}
          note="Có kết luận kỹ sư"
          icon="activity"
          tone="green"
        />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Tìm theo tên bản ghi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {filteredBags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <Icon name="search" size={32} />
            <p style={{ marginTop: '12px' }}>Không tìm thấy bản ghi rosbag nào phù hợp.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredBags.map((bag) => (
              <UserSharedBagCard key={bag.id} bag={bag} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
