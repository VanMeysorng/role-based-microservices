# Project 2 – Role-Based Microservices (JWT + API Gateway) on 3 EC2 Instances

| EC2 | Runs | Ports |
|---|---|---|
| EC2 #1 | API Gateway, Registration, Login | 5000, 5001, 5002 |
| EC2 #2 | Admin Microservice | 5003 |
| EC2 #3 | User Microservice | 5004 |

All services share one **MongoDB Atlas** database (`university_user_management`).
Postman always calls the **gateway** (`http://<EC2_1_IP>:5000`); the gateway checks the JWT role and forwards to EC2 #2 / #3.

---

## Step 0 – MongoDB Atlas (once)
1. https://cloud.mongodb.com → create a free **M0** cluster.
2. **Database Access** → add user (e.g. `meysorng` / a password without `@ : /`).
3. **Network Access** → *Add IP Address* → `0.0.0.0/0` (allow from anywhere – fine for class).
4. **Connect → Drivers** → copy the URI and add the DB name before `?`:
   ```
   mongodb+srv://meysorng:<password>@cluster0.xxxxx.mongodb.net/university_user_management?retryWrites=true&w=majority
   ```

## Task 1 – Create 3 EC2 instances
AWS Console → EC2 → **Launch instance** (do it 3 times, or set *Number of instances = 3* and rename):
- Names: `ec2-1-gateway`, `ec2-2-admin`, `ec2-3-user`
- AMI: **Ubuntu Server 24.04 LTS**, type **t2.micro / t3.micro**
- Key pair: create/download one `.pem`
- **Security group** (one shared group is easiest) – inbound rules:

| Type | Port | Source |
|---|---|---|
| SSH | 22 | My IP |
| Custom TCP | 5000-5004 | 0.0.0.0/0 |

Connect (EC2 → *Connect* → *EC2 Instance Connect*, or `ssh -i key.pem ubuntu@<PUBLIC_IP>`), then on **each** instance:
```bash
sudo apt update -y && sudo apt upgrade -y
git --version || sudo apt install -y git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```
📸 Screenshot the terminal showing the update, `git --version`, `node -v`, `npm -v`.

## Task 2 – Public IPs
EC2 → Instances → click each instance → **Public IPv4 address**. 📸 One screenshot per instance (3).
> Don't **stop** the instances before grading – public IPs change on stop/start. (Reboot is fine.)

## Task 4 – Put the EC2 IPs in GitHub (do this before Task 3)
On your laptop, edit `api-gateway/server.js`:
```js
const EC2_2_IP = process.env.EC2_2_IP || '3.110.xx.xx';   // admin-service public IP
const EC2_3_IP = process.env.EC2_3_IP || '13.233.xx.xx';  // user-service public IP
```
Then:
```bash
git add .
git commit -m "Project 2: EC2 deployment with public IPs"
git push origin main
```
📸 Screenshot the GitHub file showing the IPs and share: `https://github.com/VanMeysorng/role-based-microservices`

## Task 3 – Clone & run on each EC2
On **all three** instances:
```bash
git clone https://github.com/VanMeysorng/role-based-microservices.git
cd role-based-microservices
```
Then run the matching line (paste your Atlas URI in quotes):
```bash
# EC2 #1 – Gateway + Register + Login
bash setup.sh 1 "mongodb+srv://...university_user_management?retryWrites=true&w=majority"
# EC2 #2 – Admin
bash setup.sh 2 "mongodb+srv://..."
# EC2 #3 – User
bash setup.sh 3 "mongodb+srv://..."
```
The script writes the `.env` files (they're not in GitHub), runs `npm install`, and starts the services with **pm2** so they keep running after you close the terminal.

Check: `pm2 list` (all *online*) and `pm2 logs` (should say `MongoDB Connected`).
📸 For 3.1 / 3.2 / 3.3 screenshot `pm2 list` + browser at:
- `http://<EC2_1_IP>:5000/` → gateway JSON listing the EC2 #2/#3 URLs
- `http://<EC2_2_IP>:5003/` → `Admin Service`
- `http://<EC2_3_IP>:5004/` → `User Service`

Changed the code later? `git pull && pm2 restart all` on that EC2.

## Tasks 5–8 – Postman
Import `Project2.postman_collection.json` → collection **Variables** → set `gateway` = `http://<EC2_1_IP>:5000` → Save.
Login requests auto-save `adminToken` / `userToken`, so run them in order.

| Task | Request | Expected |
|---|---|---|
| 5.1 | `POST /register/userregister` (admin, then user) | `201 User registered successfully` + 📸 Atlas → Browse Collections → `users` |
| 5.2 | Same email again | `409 Email already registered` |
| 6.1 | `POST /auth/login` role `admin` | `200` + `token` |
| 6.2 | `POST /auth/login` role `user` | `200` + `token` |
| 7.1 | `GET /admin/viewalluser` + admin JWT | `200` list of users |
| 7.2 | `PUT /user/updateprofile` + user JWT | `200 Profile updated successfully` |
| 8.1 | `PUT /user/updateprofile` + **admin** JWT | `403 Forbidden: 'admin' is not authorized…` |
| 8.2 | `GET /admin/viewalluser` + **user** JWT | `403 Forbidden: 'user' is not authorized…` |

📸 Each screenshot must show the **URL bar (with the EC2 IP), the Authorization tab/token, and the response body + status**. Tip: in Postman click *Variables* hover or use the actual IP in the URL so the IP is visible.

## Troubleshooting
- **Timeout in Postman/browser** → security group missing port 5000-5004, or service not running (`pm2 list`).
- **502 "Admin Service unreachable"** → wrong IP in `api-gateway/server.js`, or EC2 #2 down. Fix, push, `git pull && pm2 restart all` on EC2 #1.
- **`MongoDB Connection Error`** in `pm2 logs` → Atlas Network Access not `0.0.0.0/0`, or password has special chars (URL-encode them).
- **401 Token expired** → tokens last 1h, log in again.
