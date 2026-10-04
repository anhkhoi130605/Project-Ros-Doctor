@echo off
REM Chuyen doi rosbag .db3 sang .mcap bang Python trong .venv
.\.venv\Scripts\python.exe src\convert_to_mcap.py %*
