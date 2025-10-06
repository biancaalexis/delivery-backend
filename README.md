# FastBite Backend - Food Delivery Platform

A real-time food delivery platform backend built with Node.js, Express, MongoDB, Kafka, and WebSocket.

## Features

- **Real-time Order Tracking**: WebSocket-based live updates for order status
- **Event-Driven Architecture**: Apache Kafka for event streaming and processing
- **Multi-Role System**: Customer, Rider, and Admin dashboards
- **Notification System**: Real-time push notifications for all users
- **Rating System**: Order and rider rating functionality
- **Analytics Dashboard**: Comprehensive admin analytics and reporting
- **Communication Services**: SMS, Email, and Push notification support

## Tech Stack

- **Node.js & Express**: RESTful API server
- **MongoDB & Mongoose**: Database and ODM
- **Socket.io**: Real-time bidirectional communication
- **KafkaJS**: Event streaming and message queue
- **JWT**: Authentication and authorization
- **Bcrypt**: Password hashing

## Prerequisites

- Node.js >= 14.x
- MongoDB >= 4.x
- Apache Kafka >= 2.x (optional for development)
- npm or yarn

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd fastbite-backend