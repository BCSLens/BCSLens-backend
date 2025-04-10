# Use the official Node.js image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Install Python and required dependencies
RUN apt-get update && apt-get install -y python3 python3-pip

# Copy the Python dependencies file (requirements.txt)
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Copy package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port that the app runs on
EXPOSE 3000

# Run the Python script and the Node.js app in parallel
CMD python3 yolo/yolo_inference.py & node index.js
