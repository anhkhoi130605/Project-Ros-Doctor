import { apiClient } from './apiClient';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const AI_AGENT_URL = import.meta.env.VITE_AI_AGENT_URL || '/ai-agent';

/**
 * Lấy danh sách vai trò và thành viên thực tế từ Database
 */
export async function getChatRolesFromDbApi() {
  return apiClient.get('/api/chat/roles');
}

/**
 * Lấy lịch sử tin nhắn thực tế của một Role từ Database
 */
export async function getChatMessagesByRoleApi(role) {
  return apiClient.get(`/api/chat/messages?role=${encodeURIComponent(role)}`);
}

/**
 * Gửi tin nhắn qua REST API
 */
export async function sendChatMessageRestApi(payload) {
  return apiClient.post('/api/chat/messages', payload);
}

/**
 * Khởi tạo kết nối SignalR Hub cho tính năng Chat Realtime giữa các Role
 */
export function createSignalRChatConnection() {
  const backendUrl =
    import.meta.env.VITE_API_URL ||
    (window.location.protocol === 'https:' ? 'https://localhost:7149' : 'http://localhost:5143');
  return new HubConnectionBuilder()
    .withUrl(`${backendUrl}/hubs/chat`, {
      accessTokenFactory: () => localStorage.getItem('accessToken') || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();
}

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
 * Lấy cấu hình AI hiệu lực dựa trên chức năng (chat, diagnostic, report...) hoặc cấu hình người dùng
 */
export function getEffectiveAiConfig(feature = 'chat') {
  let model = localStorage.getItem('ai_model_name') || 'qwen-2.5-coder-32b';
  let apiKey = localStorage.getItem('ai_api_key') || '';
  let temperature = 0.2;
  let systemPrompt = '';

  // 1. Kiểm tra cấu hình chuyên biệt theo chức năng
  try {
    const rawFeatures = localStorage.getItem('ai_per_feature_configs');
    if (rawFeatures) {
      const featureConfigs = JSON.parse(rawFeatures);
      if (featureConfigs && featureConfigs[feature]) {
        const fc = featureConfigs[feature];
        if (fc.modelName) model = fc.modelName;
        if (fc.apiKey) apiKey = fc.apiKey;
        if (fc.temperature !== undefined) temperature = Number(fc.temperature);
        if (fc.prompt) systemPrompt = fc.prompt;
      }
    }
  } catch {}

  // 2. Kiểm tra cấu hình riêng của người dùng đang đăng nhập
  try {
    const activeUserId = localStorage.getItem('userId');
    const rawUsers = localStorage.getItem('ai_per_user_configs');
    if (activeUserId && rawUsers) {
      const userConfigs = JSON.parse(rawUsers);
      if (userConfigs && userConfigs[activeUserId]) {
        const uc = userConfigs[activeUserId];
        if (uc.modelName && uc.customModel) model = uc.modelName;
        if (uc.apiKey && uc.customApiKey) apiKey = uc.apiKey;
      }
    }
  } catch {}

  return { model, apiKey, temperature, systemPrompt };
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

  const effectiveConfig = getEffectiveAiConfig('chat');
  if (effectiveConfig.apiKey && effectiveConfig.apiKey.trim()) {
    payload.api_key = effectiveConfig.apiKey.trim();
  }
  if (effectiveConfig.model && effectiveConfig.model.trim()) {
    payload.model = effectiveConfig.model.trim();
  }
  if (effectiveConfig.temperature !== undefined) {
    payload.temperature = effectiveConfig.temperature;
  }
  if (effectiveConfig.systemPrompt) {
    payload.system_prompt = effectiveConfig.systemPrompt;
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

  const effectiveConfig = getEffectiveAiConfig('chat');
  if (effectiveConfig.apiKey && effectiveConfig.apiKey.trim()) {
    payload.api_key = effectiveConfig.apiKey.trim();
  }
  if (effectiveConfig.model && effectiveConfig.model.trim()) {
    payload.model = effectiveConfig.model.trim();
  }
  if (effectiveConfig.temperature !== undefined) {
    payload.temperature = effectiveConfig.temperature;
  }
  if (effectiveConfig.systemPrompt) {
    payload.system_prompt = effectiveConfig.systemPrompt;
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
