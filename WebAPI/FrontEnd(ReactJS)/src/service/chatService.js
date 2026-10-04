const AI_AGENT_URL = import.meta.env.VITE_AI_AGENT_URL || '/ai-agent';

/**
 * Gửi tin nhắn hỏi đáp chẩn đoán sự cố ROS2 tới Python AI Agent (LangGraph + RAG).
 * @param {string} message - Câu hỏi hoặc truy vấn của kỹ sư
 * @returns {Promise<{response: string, analysis: string}>}
 */
export async function sendChatMessageApi(message) {
  const response = await fetch(`${AI_AGENT_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errMsg = `Lỗi kết nối AI Agent (${response.status})`;
    if (typeof errorData.detail === 'string') {
      errMsg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errMsg = errorData.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
    } else if (errorData.detail && typeof errorData.detail === 'object') {
      errMsg = JSON.stringify(errorData.detail);
    }
    throw new Error(errMsg);
  }

  return response.json();
}
