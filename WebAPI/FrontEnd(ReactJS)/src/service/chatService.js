const AI_AGENT_URL = import.meta.env.VITE_AI_AGENT_URL || '/ai-agent';

/**
 * Đồng bộ cấu hình API Key và Model trực tiếp sang Python AI Agent.
 */
export async function syncAiConfigToAgentApi(config) {
  try {
    const res = await fetch(`${AI_AGENT_URL}/api/v1/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        model: config.modelName,
        base_url: config.baseUrl,
      }),
    });
    return res.json();
  } catch (err) {
    console.warn('[AI Agent] Failed to sync config:', err);
    return null;
  }
}

/**
 * Gửi tin nhắn hỏi đáp chẩn đoán sự cố ROS2 tới Python AI Agent (LangGraph + RAG).
 * @param {string} message - Câu hỏi hoặc truy vấn của kỹ sư
 * @returns {Promise<{response: string, analysis: string}>}
 */
export async function sendChatMessageApi(message, sessionId = null, bagId = null) {
  const payload = { message };
  if (sessionId) payload.session_id = sessionId;
  if (bagId) payload.bag_id = bagId;

  const storedApiKey = localStorage.getItem('ai_api_key');
  if (storedApiKey && storedApiKey.trim()) {
    payload.api_key = storedApiKey.trim();
  }
  const storedModel = localStorage.getItem('ai_model_name');
  if (storedModel && storedModel.trim()) {
    payload.model = storedModel.trim();
  }

  const response = await fetch(`${AI_AGENT_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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

/**
 * Gửi tin nhắn và stream từng token qua Server-Sent Events (SSE).
 * @param {string} message - Câu hỏi của kỹ sư
 * @param {string|null} sessionId - ID phiên
 * @param {string|null} bagId - ID rosbag
 * @param {(token: string) => void} onToken - Callback khi nhận token mới
 * @param {(finalData: any) => void} onDone - Callback khi stream hoàn tất
 * @param {(err: Error) => void} onError - Callback khi gặp lỗi
 */
export async function streamChatMessageApi(message, sessionId = null, bagId = null, onToken, onDone, onError) {
  const payload = { message };
  if (sessionId) payload.session_id = sessionId;
  if (bagId) payload.bag_id = bagId;

  const storedApiKey = localStorage.getItem('ai_api_key');
  if (storedApiKey && storedApiKey.trim()) {
    payload.api_key = storedApiKey.trim();
  }
  const storedModel = localStorage.getItem('ai_model_name');
  if (storedModel && storedModel.trim()) {
    payload.model = storedModel.trim();
  }

  try {
    const response = await fetch(`${AI_AGENT_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData.detail || `Lỗi kết nối AI Agent (${response.status})`;
      throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.error) {
              if (onError) onError(new Error(data.error));
              return;
            }
            if (data.token && onToken) {
              onToken(data.token);
            }
            if (data.done && onDone) {
              onDone(data);
            }
          } catch (e) {
            console.warn('Could not parse SSE JSON chunk:', jsonStr);
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
    else throw err;
  }
}
