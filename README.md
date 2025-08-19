<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Smart Device Management API](#smart-device-management-api)
  - [Overview](#overview)
  - [Features](#features)
  - [Setup and Initialization](#setup-and-initialization)
    - [Requirements](#requirements)
    - [Setup Instructions](#setup-instructions)
  - [API Endpoints](#api-endpoints)
    - [User Management](#user-management)
      - [1. Register User Endpoint: `/auth/signup`](#1-register-user-endpoint-authsignup)
      - [2. Login User Endpoint: `/auth/login`](#2-login-user-endpoint-authlogin)
    - [Device Management](#device-management)
      - [1. Register Device Endpoint: `/devices`](#1-register-device-endpoint-devices)
      - [2. List Devices Endpoint: `/devices`](#2-list-devices-endpoint-devices)
      - [3. Update Heartbeat Endpoint: `/devices/:id/heartbeat`](#3-update-heartbeat-endpoint-devicesidheartbeat)
      - [4. Create Log Endpoint: `/devices/:id/logs`](#4-create-log-endpoint-devicesidlogs)
      - [5. Get Device Logs Endpoint: `/devices/:id/logs`](#5-get-device-logs-endpoint-devicesidlogs)
      - [6. Get Usage Analytics Endpoint: `/devices/:id/usage`](#6-get-usage-analytics-endpoint-devicesidusage)
  - [General Guidelines](#general-guidelines)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Smart Device Management API

## Overview

The Smart Device Management API is a backend service designed to manage users and their smart devices. It is built with **Node.js**, **Express**, and **MongoDB**. The system provides a comprehensive set of functionalities, including user authentication, device management, real-time logging, usage analytics, and a background job to maintain device status.

## Features

* **User Management:** Securely register and log in users with JWT-based authentication.
* **Device Management:** Register new smart devices and retrieve a list of existing devices, with optional filtering.
* **Device Status:** Update device status with a heartbeat mechanism and a background job that deactivates inactive devices.
* **Logging:** Create and retrieve logs for specific device events.
* **Usage Analytics:** View aggregated usage data for devices over various time ranges.

## Setup and Initialization

### Requirements

* Node.js (v18+ recommended)
* Docker & Docker Compose (optional, for containerized setup)
* MongoDB instance (local or Dockerized)

### Setup Instructions

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ashishmor-17/device_manager.git
    cd device_manager
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create `.env` file:**
    Create a `.env` file in the project root with the following variables:

    ```env
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/smartdevices
    JWT_SECRET=your_jwt_secret_key
    ```

4.  **Running Locally:**

    ```bash
    npm run dev
    ```

    The server will start on `http://localhost:3000`.

5.  **Running with Docker:**

    ```bash
    docker-compose up --build
    ```

## API Endpoints

### User Management

#### 1. Register User Endpoint: `/auth/signup`

* **Method:** `POST`
* **Description:** Registers a new user.
* **Request Body:**

    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "user_password@12#3",
      "role": "user"
    }
    ```

* **Response:**

    ```json
    {
      "success": true,
      "message": "User registered successfully."
    }
    ```

#### 2. Login User Endpoint: `/auth/login`

* **Method:** `POST`
* **Description:** Logs in a user and returns a JWT token.
* **Request Body:**

    ```json
    {
      "email": "john.doe@example.com",
      "password": "user_password@12#3"
    }
    ```

* **Response:**

    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "60c72b2f9b1d8c0d5c3f9a7b",
        "name": "John Doe",
        "email": "john.doe@example.com"
      }
    }
    ```

---

### Device Management

#### 1. Register Device Endpoint: `/devices`

* **Method:** `POST`
* **Description:** Registers a new smart device.
* **Request Body:**

    ```json
    {
      "name": "Living Room Light",
      "type": "light",
      "status": "active"
    }
    ```

* **Response:**

    ```json
    {
      "success": true,
      "device": {
        "id": "60c72b2f9b1d8c0d5c3f9a7c",
        "name": "Living Room Light",
        "type": "light",
        "status": "active",
        "last_active_at": "2025-08-19T10:00:00.000Z"
      }
    }
    ```

#### 2. List Devices Endpoint: `/devices`

* **Method:** `GET`
* **Description:** Lists all devices for the authenticated user, with optional filtering by `type` or `status`.
* **Query Parameters:**
    * `type`: (optional) `light`, `speaker`, etc.
    * `status`: (optional) `active` or `inactive`
* **Response:**

    ```json
    {
      "success": true,
      "devices": [
        {
          "id": "60c72b2f9b1d8c0d5c3f9a7c",
          "name": "Living Room Light",
          "type": "light",
          "status": "active"
        },
        {
          "id": "60c72b2f9b1d8c0d5c3f9a7d",
          "name": "Smart Speaker",
          "type": "speaker",
          "status": "active"
        }
      ]
    }
    ```

#### 3. Update Heartbeat Endpoint: `/devices/:id/heartbeat`

* **Method:** `POST`
* **Description:** Updates the last active time and status of a device.
* **Request Body:**

    ```json
    {
      "status": "active"
    }
    ```

* **Response:**

    ```json
    {
      "success": true,
      "message": "Heartbeat updated.",
      "last_active_at": "2025-08-19T10:05:00.000Z"
    }
    ```

#### 4. Create Log Endpoint: `/devices/:id/logs`

* **Method:** `POST`
* **Description:** Creates a new log entry for a device.
* **Request Body:**

    ```json
    {
      "event": "units_consumed",
      "value": 10.5
    }
    ```

* **Response:**

    ```json
    {
      "success": true,
      "log": {
        "id": "60c72b2f9b1d8c0d5c3f9a7e",
        "device_id": "60c72b2f9b1d8c0d5c3f9a7c",
        "event": "units_consumed",
        "value": 10.5,
        "timestamp": "2025-08-19T10:06:00.000Z"
      }
    }
    ```

#### 5. Get Device Logs Endpoint: `/devices/:id/logs`

* **Method:** `GET`
* **Description:** Retrieves a list of logs for a specific device, with optional `limit`.
* **Query Parameters:**
    * `limit`: (optional) `number` of logs to return.
* **Response:**

    ```json
    {
      "success": true,
      "logs": [
        {
          "event": "units_consumed",
          "value": 10.5
        },
        {
          "event": "status_change",
          "value": "active"
        }
      ]
    }
    ```

#### 6. Get Usage Analytics Endpoint: `/devices/:id/usage`

* **Method:** `GET`
* **Description:** Gets aggregated usage data for a device over a specified time range.
* **Query Parameters:**
    * `range`: `24h`, `7d`, or `30d`
* **Response:**

    ```json
    {
      "success": true,
      "total_units_consumed": 250.7
    }
    ```

## General Guidelines

* User roles are either `user` or `admin`. Admin features are not implemented but reserved for future use.
* Users can only access their own devices, which are linked by user ID.
* Device statuses are validated as `active` or `inactive`.
* The system uses **bcrypt** for password hashing and **JWT tokens** that expire after 24 hours.
* Rate limiting is set to **100 requests per minute per user**.
* A background job runs every hour to deactivate devices that have been inactive for more than 24 hours.
* No email verification or password reset flows are implemented.
* No frontend/UI is included; this is a backend-only API service.