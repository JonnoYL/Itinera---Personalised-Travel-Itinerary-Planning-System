# Personalised Travel Itinerary Planning System for COMP3900

## Installation and Running for MacOS

### Before Beginning:

Check Internet Connection:

- Ensure that there is a stable network connection for package downloads
- Ensure that the laptop and phone are both connected to the same Wi-Fi network

Download Expo Go on Phone (iPhone):

1. Open the App Store
2. Search for Expo Go
3. Download Expo Go
4. Open Expo Go
5. Allow all permissions
6. Register an account for Expo Go

### This guide will walk through:
- Installing Homebrew
- Installing Node.js and npm
- Installing Python (correct version)
- Changing Python to the correct version (if previously installed)
- Setting up the .env file
- Setting up the database
- Frontend installation
- Backend installation
- Running the application
- Frontend manual testing
- Backend manual testing

### 1. Installing Homebrew

Skip this step if completed

- Visit the provided link below and follow the instructions: https://brew.sh

### 2. Installing Node.js and npm

Skip this step if completed

1. Visit the provided link below: https://nodejs.org/en/download

2. Download the macOS Installer (.pkg) file

3. Open the macOS Installer (.pkg) file and follow the instructions

### 3. Installing Python

Skip this step if completed

1. Visit the provided link below: https://www.python.org/downloads/

2. Scroll down and download the Python 3.13.9 file under Looking for a specific release?

3. Open the Python 3.13.9 file and follow the instructions

### 4. Changing Python to the correct version

1. Check the Python version

```
python3 --version
```

If the Python version is 3.13.9, skip this step

2. Install pyenv

```
brew update
brew install pyenv
```

3. Wire pyenv into zsh

```
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init --path)"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
```

4. Reload the shell

```
source ~/.zshrc
```

5. Check what Python versions are available

```
pyenv install -l | grep "3.13"
```

6. Install Python 3.13.9 and make Python 3.13.9 the default version

```
pyenv install 3.13.9
pyenv global 3.13.9
pyenv rehash
```

7. Verify the installation

```
python3 --version
```

Note: 3.13.9 should be outputted.

### 5. Setting up the .env file

1. Create a .env file in the root directory of the codebase

```
code .env
```

2. Copy and paste the .env information from the project report into the root directory .env file

3. Create a .env file in the frontend directory of the codebase

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
code .env
```

4. Copy and paste the .env information from the project report into the frontend directory .env file

5. Find the Computer/Mac's LAN IP

```
ipconfig getifaddr en0
```

Example:

```
192.168.68.51
```

6. Add the LAN IP output to EXPO_PUBLIC_API_URL into the frontend directory .env file

Example:

```
EXPO_PUBLIC_API_URL=http://192.168.68.51:8000
```

### 6. Setting up the database

1. Download PostgreSQL via Homebrew in the root directory of the codebase

```
brew install postgresql
```

2. Start PostgreSQL

```
brew services start postgresql@14
```

3. Open PostgreSQL to create the Database

Note: Replace all instances of {POSTGRES_USER}, {POSTGRES_PASSWORD}, {POSTGRES_DB} with the actual values from the root directory .env file

```
psql postgres
```
```
postgres=# CREATE USER {POSTGRES_USER} WITH PASSWORD '{POSTGRES_PASSWORD}';
```
```
postgres=# CREATE DATABASE {POSTGRES_DB} OWNER {POSTGRES_USER};
```
```
postgres=# GRANT ALL PRIVILEGES ON DATABASE {POSTGRES_DB} TO {POSTGRES_USER};
```
```
\q
```

4. Verify setting up the Database

```
psql -U admin -d users
```
```
\q
```

### 7. Frontend installation

1. Navigate to the frontend directory

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

2. Install the project dependencies

```
npm install
```

### 8. Backend installation

1. Navigate to the backend directory

```
cd capstone-project-25t3-3900-h13a-banana/backend/
```

2. Install the project dependencies

```
pip3 install -r requirements.txt
```

### 9. Running the application

1. Create 2 terminal windows

2. Navigate to the backend directory in the first terminal window

```
cd capstone-project-25t3-3900-h13a-banana/backend/
```

3. Run the backend

```
python3 main.py
```

Open `localhost:8000/docs` on any browser and a swagger document should be shown listing the existing API routes

4. Navigate to the frontend directory in the second terminal window

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

5. Run the frontend

```
npx expo start
```

6. Open the camera application on the phone

7. Scan the QR code that is displayed on the frontend terminal window

8. Follow the link to open Expo Go and launch the application

### 10. Frontend manual testing

1. Ensure the frontend is running

2. Create another terminal window and navigate to the frontend directory

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

3. Run the command:

```
npm run test:coverage
```

4. Review the test output and coverage summary in the terminal

### 11. Backend manual testing

1. Ensure the backend is running

2. Create another terminal window and navigate to the backend directory

```
cd capstone-project-25t3-3900-h13a-banana/backend/
```

3. Run the command:

```
pytest --cov=. --cov-report=term
```

4. Review the test output and coverage summary in the terminal
