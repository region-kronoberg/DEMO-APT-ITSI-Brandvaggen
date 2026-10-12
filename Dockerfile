# Spelet är statiska filer, så en liten nginx räcker.
FROM nginx:1.27-alpine

# Säkerhetshuvuden och cache-inställningar
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Själva spelet
COPY app/ /usr/share/nginx/html/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
