.PHONY: help install build dev test test-watch lint lint-fix format clean docker-build docker-run docker-stop docker-logs setup-db migrate seed

# Default target
help:
	@echo "FlowForge Nexus - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  install      Install dependencies"
	@echo "  build        Build the application"
	@echo "  dev          Start development server"
	@echo "  test         Run tests"
	@echo "  test-watch   Run tests in watch mode"
	@echo "  lint         Run linter"
	@echo "  lint-fix     Fix linting issues"
	@echo "  format       Format code with Prettier"
	@echo "  clean        Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build Build Docker image"
	@echo "  docker-run   Start all services with Docker Compose"
	@echo "  docker-stop  Stop all Docker services"
	@echo "  docker-logs  Show Docker logs"
	@echo ""
	@echo "Database:"
	@echo "  setup-db     Setup database and run migrations"
	@echo "  migrate      Run database migrations"
	@echo "  seed         Seed database with sample data"
	@echo ""
	@echo "Infrastructure:"
	@echo "  k8s-deploy   Deploy to Kubernetes"
	@echo "  helm-install Install with Helm"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Build the application
build:
	@echo "Building application..."
	npm run build

# Start development server
dev:
	@echo "Starting development server..."
	npm run dev

# Run tests
test:
	@echo "Running tests..."
	npm test

# Run tests in watch mode
test-watch:
	@echo "Running tests in watch mode..."
	npm run test:watch

# Run linter
lint:
	@echo "Running linter..."
	npm run lint

# Fix linting issues
lint-fix:
	@echo "Fixing linting issues..."
	npm run lint:fix

# Format code
format:
	@echo "Formatting code..."
	npm run format

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	npm run clean

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t flowforge-nexus:latest .

# Start all services with Docker Compose
docker-run:
	@echo "Starting all services..."
	docker-compose up -d

# Stop all Docker services
docker-stop:
	@echo "Stopping all services..."
	docker-compose down

# Show Docker logs
docker-logs:
	@echo "Showing Docker logs..."
	docker-compose logs -f

# Setup database
setup-db:
	@echo "Setting up database..."
	docker-compose up -d postgres
	@echo "Waiting for database to be ready..."
	@sleep 10
	@echo "Database setup complete!"

# Run database migrations
migrate:
	@echo "Running database migrations..."
	npm run migration:run

# Seed database
seed:
	@echo "Seeding database..."
	npm run seed

# Deploy to Kubernetes
k8s-deploy:
	@echo "Deploying to Kubernetes..."
	kubectl apply -f k8s/

# Install with Helm
helm-install:
	@echo "Installing with Helm..."
	helm repo add flowforge https://charts.flowforge.io
	helm install nexus flowforge/nexus --values helm/values.yaml

# Quick start development environment
quick-start: install docker-run setup-db
	@echo "Development environment is ready!"
	@echo "Application: http://localhost:3000"
	@echo "API Docs: http://localhost:3000/api/docs"
	@echo "Grafana: http://localhost:3001 (admin/admin)"
	@echo "Jaeger: http://localhost:16686"
	@echo "Prometheus: http://localhost:9090"

# Stop everything and clean up
stop-all: docker-stop
	@echo "All services stopped and cleaned up"
