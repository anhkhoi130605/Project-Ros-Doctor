@echo off
REM Khoi chay giao dien lai xe thu cong (Manual Control) trong CARLA
echo [*] Dang khoi dong cua so dieu khien xe CARLA...
echo [*] Phim dieu khien:
echo     - W / Mui ten Len: Ga
echo     - S / Mui ten Xuong: Phanh / Lui
echo     - A / D: Re Trai / Phai
echo     - Space: Phanh tay
echo     - P: Bat / Tat che do tu lai (Autopilot)
echo     - Tab: Doi goc nhin camera
echo     - Q: Chuyen so lui
echo ========================================================
wsl -d Ubuntu-24.04 /home/anhkhoipham12/miniconda3/envs/carla37/bin/python /mnt/d/Project-VinUni/carla_sim/CARLA_0.9.15/WindowsNoEditor/PythonAPI/examples/manual_control.py %*
