# ping_pong

Prerequisites: 
Fast API framework >= 0.112.0
React >= 18.3.0
Make sure no other local development running at the moment you are setting up. 


Steps to setup and run on local machine: 
1. Open your folder directory terminal
2. run command "git clone https://github.com/sid0000007/ping_pong.git" 
3. run command "cd frontend"
4. run command "npm i"
5. run command "npm run dev"
5. run command "cd .."
6. run command "cd backend"
7. run command "python -m venv venv
                source venv/bin/activate
                pip install fastapi uvicorn websockets"
8. run command "uvicorn main:app --reload --port 8000"

9. open any locally connected browser and go to "http://localhost:3000/"


