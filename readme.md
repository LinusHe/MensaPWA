# Mensa PWA

The Mensa PWA is an progressive web application designed to assist HTWK Leipzig students in locating their friends at the Mensa Academica and exploring the day's meal offerings.

![Mockup Image](.github/preview-images/mockup.png)

## Installation and Execution

### Prerequisites
* Docker
* Docker Compose

### Installation
Navigate to the project directory and execute the following commands based on your environment:
* For development: `docker-compose -f docker-compose.dev.yml up -d`
* For production (requires traefik service): `docker-compose -f docker-compose.prod.yml up -d`
* For local production: `docker-compose -f docker-compose.local-prod.yml up -d`

After starting the services, they can be accessed on the following ports and URLs:
* `client`: Accessible at `http://localhost:3000` when running the development docker-compose command, else accessible at `http://localhost:80` and `https://localhost:443`

### Developing the React Frontend Independently
If no backend infrastructure is needed and only the React frontend wants to be developed, navigate to the client folder and execute the following commands:
* `npm install`
* `npm start`

This requires Node.js and npm to be installed on your machine.

### Infrastructure
The application consists of the following services:
* `client`: The React frontend of the application.
* `nightly`: Deprecated locally. The generation has moved to Firebase Functions. The `nightly` service is no longer started in local/dev/prod compose files.
* `firebase`: Manages and sends push notifications to users, by using a cloud database and a cronjob service that runs a firebase messaging service.

### Environment Variables
The following environment variables are required:
* `OPENAI_API_KEY`: Only needed if you run the deprecated `nightly` image manually. Not required for standard local/dev/prod usage anymore.

For deployment, the following additional environment variables are required and are best stored in the repository:
* `DOCKER_PASSWORD`: This is your Docker account password. It's needed to pull and push images from Docker Hub.
* `DOCKER_USERNAME`: This is your Docker account username. It's needed to authenticate with Docker Hub.
* `SERVER_HOST`: This is the IP address or domain name of your server. It's needed to know where to deploy the application.
* `SERVER_USERNAME`: This is the username of your server. It's needed to authenticate with the server.
* `SSH_KEY`: This is the private SSH key corresponding to the public key added to your server. It's needed to establish a secure connection with the server.
* `GH_TOKEN`: This is a personal GitHub access token. It's used by the Semantic Release tool for automating version management and package publishing. It authenticates and authorizes the tool to commit to the repository, create tags, and create GitHub releases.

### Deployment
* The GitHub Actions workflow file ([`.github/workflows/main.yml`](.github/workflows/main.yml)) is responsible for deploying both the client and the nightly services to a Traefik server via SSH whenever changes are pushed to the `prod` branch. 
* The Firebase service is deployed separately using the `firebase deploy` command inside the `firebase` directory. If you want to test this, you need to create your own firebase project. You can do this by visiting the [Firebase Console](https://console.firebase.google.com/u/0/). After creating your project, replace the `firebaseConfig` in the client in the following files:
  * [`client/public/firebase-messaging-sw.js`](client/public/firebase-messaging-sw.js)
  * [`client/src/index.js`](client/src/index.js)

### Data Source Change
The client now loads menus and images directly from Firebase Storage under `data/YYYY-MM-DD/`:

- Menu JSON: `https://firebasestorage.googleapis.com/v0/b/<your-bucket>.firebasestorage.app/o/data%2FYYYY-MM-DD%2Fmenu.json?alt=media`
- Dish images: `https://firebasestorage.googleapis.com/v0/b/<your-bucket>.firebasestorage.app/o/data%2FYYYY-MM-DD%2F<image>.jpg?alt=media`

No local `public/data` folder is required anymore.


## Authors

* Linus Herterich
* Jonas Gwozdz


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.