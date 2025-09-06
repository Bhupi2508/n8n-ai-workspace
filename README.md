# n8n-ai-workspace

n8n-ai-workspace: A local automation and AI workflow hub powered by n8n. This repo contains Docker-based setup and workflows for experimenting with automation, data pipelines, and AI integrations (e.g., OpenAI, Gemini, HuggingFace).

# n8n-local

Local n8n for demos and automation development.

## Run

1. Copy `.env.example` -> `.env`, edit credentials.
2. docker compose up -d
3. docker ps | grep n8n -> `check status`
4. Open http://localhost:5678 and login (Basic Auth)

## docker useful commands

# stop

docker compose down

# start (background)

docker compose up -d

# see container status

docker compose ps

# see logs (follow)

docker compose logs -f

# fix permissions (Linux) if you get permission errors for ./n8n_data

sudo chown -R $(id -u):$(id -g) ./n8n_data
