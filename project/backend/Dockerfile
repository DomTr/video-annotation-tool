# ===========================
# Stage 1: Builder
# ===========================
FROM python:3.12-slim AS builder

# Prevent Python from writing pyc files and buffer stdout/stderr.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for building Python packages.
RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry using the official installation script.
RUN curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH.
ENV PATH="/root/.local/bin:$PATH"

# Set the working directory inside the container.
WORKDIR /app

# Copy only the dependency specification files first to leverage Docker layer caching.
COPY pyproject.toml poetry.lock ./

# Configure Poetry to not create virtual environments inside Docker.
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy the entire project into the container.
COPY . .

ENV PYTHONPATH=/app

# ===========================
# Stage 2: Production
# ===========================
FROM python:3.12-slim

# Prevent Python from writing pyc files and buffer stdout/stderr.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install runtime system dependencies.
RUN apt-get update && apt-get install --no-install-recommends -y \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container.
WORKDIR /app

# Copy installed dependencies from the builder stage.
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code from the builder stage.
COPY --from=builder /app /app

# Add a startup script for diagnostics (optional but recommended for debugging).
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set PYTHONPATH to include /app to ensure 'backend' is discoverable.
ENV PYTHONPATH=/app

# Create a non-root user to run the application.
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
USER appuser

# Expose the port your application runs on.
EXPOSE 8080

# Define the default command to run your application using the startup script.
CMD ["/app/start.sh"]

