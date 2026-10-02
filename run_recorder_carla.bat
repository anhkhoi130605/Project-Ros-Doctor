@echo off
REM Chay CARLA Rosbag Recorder voi Python 3.7 (CARLA 0.9.15 Client) tu WSL
wsl -d Ubuntu-24.04 /home/anhkhoipham12/miniconda3/envs/carla37/bin/python /mnt/d/Project-VinUni/P-137/src/record_carla_bag.py %*
