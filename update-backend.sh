#!/bin/bash
echo "⚙️ Atualizando apenas o BACKEND..."
docker compose build backend
docker compose up -d backend
echo "✅ Backend atualizado e online!"
