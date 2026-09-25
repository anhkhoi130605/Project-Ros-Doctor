import React, { useState } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card } from '../../../components/common/UIComponents';

export default function ChatPage() {
  const { state } = useApp();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: 'Xin chào! Tôi là ROS2 Diagnostic Assistant. Bạn cần truy vấn bằng chứng hay phân tích sự cố của rosbag nào?',
      at: '09:30',
    },
    {
      id: 2,
      sender: 'user',
      text: 'Tại sao topic /scan trong phiên #024 bị giảm tần số xuống 2 Hz?',
      at: '09:31',
    },
    {
      id: 3,
      sender: 'agent',
      text: 'Dựa trên đối chiếu log phiên #024, /scan bị rớt tần số từ 10 Hz xuống 2 Hz trong khoảng [00:35 - 00:40]. Nguyên nhân có thể do nghẽn băng thông ghi log hoặc QoS Publisher không phù hợp.',
      at: '09:31',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputText.trim(),
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const agentMsg = {
        id: Date.now() + 1,
        sender: 'agent',
        text: `Đã ghi nhận câu hỏi: "${userMsg.text}". Đang tra cứu cơ sở dữ liệu tri thức ROS2 & log đối chiếu...`,
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 800);
  };

  return (
    <div className="chat-page-container">
      <PageHeader
        title="Trợ lý AI chẩn đoán ROS2 Agent"
        subtitle="Hỏi đáp về bằng chứng, nguyên nhân sự cố và đối chiếu nhật ký rosbag."
      />

      <Card className="chat-card-panel">
        <div className="chat-messages-area">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
              <div className="bubble-avatar">
                {m.sender === 'agent' ? '🤖' : '👤'}
              </div>
              <div className="bubble-content">
                <p className="bubble-text">{m.text}</p>
                <span className="bubble-time">{m.at}</span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            placeholder="Nhập câu hỏi chẩn đoán (ví dụ: Tại sao TF map->odom bị thiếu?)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="primary-button">
            Gửi câu hỏi
          </button>
        </form>
      </Card>
    </div>
  );
}
