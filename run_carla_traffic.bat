@echo off
REM Sinh giao thong tu dong (30 xe + 10 nguoi di bo) trong CARLA
echo [*] Dang tao 30 xe va 10 nguoi di bo tu dong chay trong map CARLA...
wsl -d Ubuntu-24.04 /home/anhkhoipham12/miniconda3/envs/carla37/bin/python /mnt/d/Project-VinUni/carla_sim/CARLA_0.9.15/WindowsNoEditor/PythonAPI/examples/generate_traffic.py -n 30 -w 10 %*