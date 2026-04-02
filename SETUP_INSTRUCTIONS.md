# Manual Setup and Execution Instructions

Since the Gemini CLI is currently restricted by environment permissions (likely due to snap confinement), please run the following commands manually in your terminal to start the project.

### 1. Fix Docker Permissions (if needed)
If you get "Permission Denied" when running docker, ensure your user is in the `docker` group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Start the GPS Engine (Traccar)
Navigate to the project root and start the containers:
```bash
cd /mnt/c/Users/DELL/Desktop/My-Projects/my-gps-portal
docker-compose up -d
```
*Note: If `docker-compose` is not found, try `docker compose`.*

### 3. Verify Traccar is Running
Check the status of the container:
```bash
docker ps
```
You should see a container named `traccar` or similar running on port `8082`.

### 4. Start the Frontend (React)
Open a new terminal tab and run:
```bash
cd /mnt/c/Users/DELL/Desktop/My-Projects/my-gps-portal/frontend
npm install
npm run dev
```

### 5. Access the Platform
- **Traccar Web UI:** [http://localhost:8082](http://localhost:8082) (Default credentials: `admin` / `admin`)
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)

### 6. Common Troubleshooting
- **Port Conflict:** If port 8082 is taken, modify `docker-compose.yml`.
- **Database Reset:** If you need to clear Traccar data:
  ```bash
  docker-compose down
  rm -rf traccar/data/*
  docker-compose up -d
  ```

Once you have these running, I can help you with code changes, Supabase configuration, or frontend development even if I can't start the services myself!
