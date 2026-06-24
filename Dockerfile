# Lichtgewicht image voor de statische frontend: nginx serveert de bestanden
# direct, er is geen build-stap nodig (geen framework, geen bundler).
FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY data/ /usr/share/nginx/html/data/
COPY nginx/docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
