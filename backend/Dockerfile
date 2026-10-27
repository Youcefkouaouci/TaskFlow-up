FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 3000

# Default command (overridden in compose if needed)
CMD ["npm", "run", "dev"]
