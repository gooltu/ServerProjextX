# Use an official Node.js runtime as a parent image
FROM node:14 AS builder

# Install git
RUN apt-get update && apt-get install -y git

# Set the working directory in the container
WORKDIR /usr/src/app

# Clone the repository
RUN git clone https://github.com/gooltu/ServerProjextX.git .

# Install app dependencies
RUN npm install

# Create a smaller final image
FROM node:14-alpine

WORKDIR /usr/src/app

# Copy installed modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy the rest of the application code
COPY --from=builder /usr/src/app .

# Expose the port the app runs on (if you know it, otherwise you can add it later)
# EXPOSE 3000

# Define the command to run your app
CMD [ "node", "./bin/www" ]
