# Stage 1: Build the React app
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app/frontend

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Serve the React app
FROM node:20-alpine

# Install 'serve' globally
RUN npm install -g serve

# Set working directory
WORKDIR /app/frontend

# Copy the build output from the previous stage
COPY --from=build /app/frontend/build ./build

# Expose the port the app will run on
EXPOSE 3000

# Start the app using 'serve'
CMD ["serve", "-s", "build", "-l", "3000"]
