# BeatToons Backend (FastAPI)

## Run on Your Local Network (LAN / Wi-Fi)

To allow other computers or phones on the same Wi-Fi/network to connect:

1. Start the backend bound to all network interfaces (`0.0.0.0`):
   ```powershell
   uv run python main.py
   ```
   *(Or explicitly: `uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload` — you can also set `PORT=8080` if needed.)*

2. Start the frontend in `/Frontend` (already configured with `vite --host`):
   ```powershell
   npm run dev
   ```

3. From another computer on the same network, open:
   `http://<YOUR_PC_LAN_IP>:5173`
   *(The frontend automatically points API requests to `http://<YOUR_PC_LAN_IP>:8000`.)*

> **Windows Firewall:** If another device on the same network cannot reach port `8000` or `5173`, allow inbound TCP connections on those ports in Windows Defender Firewall (or ensure your Wi-Fi profile is set to **Private**).
