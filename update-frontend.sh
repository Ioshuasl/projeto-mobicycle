#!/bin/bash
echo "🚀 Atualizando apenas o FRONTEND..."
docker compose build frontend
docker compose up -d frontend
echo "✅ Frontend atualizado e online!"
