# ServerProjextX
JewelChat my side hustle. Pitch Deck: https://mayukhportfolio.s3.ap-south-1.amazonaws.com/pitchdeck.html


One-time setup:
cp .env.example .env
# then edit .env with real values (durl, dusername, dpassword, etc.)

Start (build + run in background):
docker compose up -d --build
--build rebuilds the image if you've changed source/Dockerfile since last time; drop it for a plain restart with the existing image.

Check it's running / view logs:
docker compose ps
docker compose logs -f app

Stop:
docker compose stop
This stops the container but keeps it around (fast to start again with docker compose start).

Stop and remove the container (e.g. after config changes):
docker compose down

If you'd rather skip compose and use plain docker commands directly:
# build
docker build -t serverprojectx .

# start
docker run -d --name serverprojectx --restart unless-stopped -p 3000:3000 --env-file .env serverprojectx

# stop
docker stop serverprojectx

# stop + remove
docker rm -f serverprojectx

Either way, docker stop/docker compose down is a deliberate operator action — Docker won't auto-restart after that (as expected). The restart: unless-stopped policy only kicks in for unplanned crashes while the container is supposed to be running, which is what we verified last time.