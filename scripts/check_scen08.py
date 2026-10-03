import sqlite3
from rosbags.typesys import get_typestore, Stores

ts = get_typestore(Stores.ROS2_HUMBLE)
db_path = r'D:\katzensee_d\golden_benchmark_suite\scenarios\1_fault_type_scenarios\4_tf_tree_defects\scen_08_parent_switch_unregistered\scen_08_parent_switch_unregistered.db3'
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute('SELECT timestamp, data FROM messages WHERE topic_id = 2 ORDER BY timestamp ASC')

min_ts = None
anomalies = []
for row in c.fetchall():
    if min_ts is None:
        min_ts = row[0]
    msg = ts.deserialize_cdr(row[1], 'tf2_msgs/msg/TFMessage')
    for t in msg.transforms:
        p = t.header.frame_id
        child = t.child_frame_id
        if p != 'odom':
            rel_s = (row[0] - min_ts) / 1e9
            anomalies.append((rel_s, p, child))

print(f"Total anomalous transforms: {len(anomalies)}")
if anomalies:
    print(f"First anomaly at {anomalies[0][0]:.2f}s: parent='{anomalies[0][1]}', child='{anomalies[0][2]}'")
    print(f"Last anomaly at {anomalies[-1][0]:.2f}s: parent='{anomalies[-1][1]}', child='{anomalies[-1][2]}'")
