import { sendChatMessageApi } from './chatService';

/**
 * Gửi toàn bộ telemetry và findings của session tới Python AI Agent (LangGraph + RAG RCA)
 * @param {Object} params
 * @param {Object} params.session
 * @param {Array} params.findings
 * @param {Array} params.topics
 * @returns {Promise<{response: string, analysis: string, report?: Object}>}
 */
export async function runAgentDiagnosticApi({ session, findings = [], topics = [] }) {
  const faultDetails = (findings || []).map((f, i) =>
    `${i + 1}. [${(f.severity || 'MEDIUM').toUpperCase()}] Topic '${f.topic || 'Hệ thống'}': ${f.title}
   - Khoảng thời gian: ${f.interval || 'N/A'}
   - Đo đạc thực tế: ${f.observation || f.description || 'Không có mô tả chi tiết'}
   - Đề xuất kỹ thuật sơ bộ: ${f.hypothesis || f.suggestedFix || 'Cần điều tra'}`
  ).join('\n');

  const topicSummary = (topics || []).slice(0, 15).map((t) =>
    `- ${t.topicName || t.name} (${t.topicType || t.type}): ${t.messageCount || 0} messages, ~${t.avgFrequencyHz || 0} Hz (chu kỳ tb: ${t.avgDeltaTimeMs || 0}ms)`
  ).join('\n');

  // Khử nhiễu tên tệp (Loại bỏ các gợi ý định danh bài test golden benchmark để ngăn LLM rò rỉ ngữ cảnh / ảo giác từ tên file)
  const rawName = session.name || '';
  const sanitizedName = rawName
    .replace(/\.(db3|mcap|bag)$/i, '')
    .replace(/^(scen|case)_\d+_[a-zA-Z0-9_]+/i, `Phiên Rosbag #${session.id}`)
    .replace(/_/g, ' ')
    .trim() || `Phiên Rosbag #${session.id}`;

  const promptMessage = `Yêu cầu thực hiện chẩn đoán chuyên sâu Root Cause Analysis (RCA) cho phiên phân tích Rosbag:
- Mã phiên: ${session.id}
- Tiêu đề phiên: ${sanitizedName}
- Thời lượng: ${session.duration} giây | Tổng messages: ${session.messages || session.totalMessages || 0}
- Điểm sức khỏe telemetry ban đầu: ${session.healthScore ?? 100}/100

DANH SÁCH TOPICS TELEMETRY:
${topicSummary || 'Không có danh sách topics'}

CÁC BẤT THƯỜNG TELEMETRY ĐÃ PHÁT HIỆN QUA THUẬT TOÁN ĐO ĐẠC:
${faultDetails || 'Chưa ghi nhận bất thường đo đạc rõ ràng (Nominal Clean Baseline).'}

YÊU CẦU BẮT BUỘC ĐỐI VỚI CHUYÊN GIA AI AGENT (GROUNDING & ACCURACY):
1. RÀNG BUỘC SỐ LIỆU ĐO ĐẠC (GROUNDING):
   - Chỉ kết luận lỗi trên đúng topic và con số đo đạc thực tế đã được cung cấp trong danh sách trên.
   - Tuyệt đối KHÔNG tự bịa ra tần số, tỷ lệ sụt giảm hay topic không xuất hiện trong dữ liệu đo đạc.
   - Tập trung định vị chính xác topic cảm biến cốt lõi chịu tổn thương (ví dụ /ouster/imu) thay vì các topic phụ trợ nếu chúng không có bất thường đo đạc.
2. PHÂN LOẠI & NGUYÊN NHÂN GỐC RỄ (RCA):
   - Phân loại chuẩn xác vào 1 trong 6 Miền lỗi ROS 2: topic_dropout, frequency_drop, timestamp_anomaly, tf_tree_inconsistency, sensor_anomaly, compound_fault.
   - Xác định chính xác nguyên nhân gốc rễ (RCA) tương ứng với bản chất vật lý của sự cố cốt lõi:
     * Lỗi thời gian (timestamp_anomaly: clock_drift, constant_offset, jitter): HARDWARE_CLOCK_DESYNC_OR_PTP_TIME_SYNCHRONIZATION_DRIFT, UNSYNCHRONIZED_SENSOR_CLOCK, hoặc NON_REALTIME_OS_THREAD_JITTER.
     * Lỗi tần số (frequency_drop: mild_drop, severe_drop, burst_loss): EXECUTOR_STARVATION_OR_DDS_QUEUE_OVERFLOW hoặc CPU_RESOURCE_STARVATION.
     * Lỗi cây tọa độ (tf_tree_inconsistency: tf_jump, parent_frame_switch, invalid_quaternion): SLAM_LOCALIZATION_FAILURE_OR_KIDNAPPED_ROBOT hoặc TF_TREE_RECONFIGURATION.
     * Lỗi cảm biến (sensor_anomaly: accel_spike, sensor_freeze, gyro_bias_drift): MECHANICAL_COLLISION_OR_INDUCTIVE_NOISE_SPIKE, I2C_SPI_BUS_LOCKUP, hoặc THERMAL_ZERO_RATE_BIAS_DRIFT.
     * Lỗi mất topic (topic_dropout): QoS_MISMATCH_OR_ETHERNET_LINK_FLAP hoặc TRANSFORM_NODE_FATAL_CRASH.
3. TRÍCH XUẤT BẰNG CHỨNG SỐ LIỆU:
   - Nêu chính xác khoảng thời gian (start_sec -> end_sec) và số đo định lượng (tốc độ trôi drift rate ms/s, tần số sụt giảm %, biên độ shock g, khoảng nhảy m...).
4. KỊCH BẢN KHẮC PHỤC (REMEDIATION PLAYBOOK):
   - Cung cấp hành động kỹ thuật chuẩn mực phù hợp trực tiếp với nguyên nhân gốc (ví dụ: triển khai Chrony/PTP IEEE 1588 và hardware PPS line cho clock drift; nâng cấp MultiThreadedExecutor + QoS cho frequency drop; Mahalanobis gating cho TF jump...).
5. XUẤT ĐỊNH DẠNG JSON DiagnosticReport chuẩn mực.`;

  return await sendChatMessageApi(promptMessage);
}
