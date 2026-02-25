# Personalised Travel Itinerary Planning System for COMP3900

## Installation and Running for MacOS

### Before Beginning:

Internet Connection:

- Ensure a stable network connection for package downloads
- Ensure laptop and phone are connected to same Wi-Fi network
- Note: activating Hotspot on phone and allowing laptop to connect to phone Hotspot is recommended for testing purposes

Download Expo Go on iPhone:

1. Open App Store
2. Search for Expo Go
3. Download Expo Go
4. Open Expo Go + allow all permissions
5. Register / Sign Into Expo Go

### This guide will walk through:
- Installing Homebrew
- Installing Node.js and npm
- Installing Python (correct version)
- Changing Python Version (if previously installed)
- Setting up .env file
- Setting up Database
- Frontend Installation
- Backend Installation
- Running Application
- Frontend Manual Unit Testing

### 1. Installing Homebrew

Skip this step if completed

1. To install Homebrew:
https://brew.sh

2. Copy and paste following command into terminal:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Installing Node.js and npm

1. To install Node.js and npm
https://nodejs.org/en/download

2. Download macOS Installer (.pkg) file

3. Open downloaded .pkg file and follow instructions

### 3. Installing Python

Skip this step if completed

1. To install Python:
https://www.python.org/downloads/

2. Scroll down and download Python 3.13.9 file under Looking for a specific release?

3. Open downloaded Python 3.13.9 file and follow instructions

### 4. Changing Python Version Using pyenv

1. Check Python Version

```
python --version
```

If Python Version is 3.13.9, skip this step

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

4. Reload shell

```
source ~/.zshrc
```

5. Check what versions are available

```
pyenv install -l | grep "3.13"
```

6. Install Python 3.13.9 and make it default

```
pyenv install 3.13.9
pyenv global 3.13.9
pyenv rehash
```

7. Verify

```
python --version
python3 --version
```

Both should show 3.13.9.

### 5. Set Up .env file

1. In root directory of codebase, create a ".env" file

2. Copy and Paste .env information in root directory .env file

3. In frontend directory of codebase, create a ".env" file

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

4. Copy and Paste .env information in frontend directory .env file

5. Find your Computer/Mac's LAN IP

```
ipconfig getifaddr en0
```

Example Output: 192.168.68.51

Or check active interface

6. In frontend .env file, add LAN IP output to EXPO_PUBLIC_API_URL

```
EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000
```

E.g.

```
EXPO_PUBLIC_API_URL=http://192.168.68.51:8000
```

### 6. Setting Up Database

1. In root directory, download PostgreSQL via Homebrew

```
brew install postgresql
```

2. Start PostgreSQL

```
brew services start postgresql@14
```

3. Open PostgreSQL to create Database

Note: Replace all instances of {POSTGRES_USER}, {POSTGRES_PASSWORD}, {POSTGRES_DB} with actual values from root directory .env file

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

4. Verify setting up Database

```
psql -U admin -d users
```
```
\q
```

### 7. Frontend Installation

1. Change directory to frontend directory

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

2. Install project dependencies

```
npm install
```

### 8. Backend Installation

1. Change directory to backend directory

```
cd capstone-project-25t3-3900-h13a-banana/backend/
```

2. Install project dependencies

```
pip install -r requirements.txt
```

or if above command does not work

```
pip3 install -r requirements.txt
```

### 9. Running Application

1. Create 2 terminal windows

2. In first terminal window, change directory to backend directory

```
cd capstone-project-25t3-3900-h13a-banana/backend/
```

3. Run backend

```
python main.py
```

or if above command does not work

```
python3 main.py
```

Open `localhost:8000/docs` on any browser and a swagger document should be shown listing existing API routes.

4. In second terminal window, change directory to frontend directory

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

5. Run frontend

```
npx expo start
```

6. Open Camera Application on phone, scan QR code displayed on frontend terminal window and follow link

This will automatically open Expo Go and launch application

### 10. Frontend Manual Testing

1. Ensure frontend is running

2. Create another terminal window and change directory to frontend

```
cd capstone-project-25t3-3900-h13a-banana/frontend/
```

3. Run

```
npm run test:coverage
```

4. Review test output and coverage summary in Terminal.

### 11. Backend Manual Testing

1. Create another terminal window and change directory to frontend

```
cd capstone-project-25t3-3900-h13a-banana/backend/
```

2. Run

```
pytest --cov=. --cov-report=term
```
3. Review test output and coverage summary in Terminal.



[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=20570623&assignment_repo_type=AssignmentRepo)