#!/bin/sh
set -e

# Sustituye solo ${API_URL} en nginx.conf, dejando las variables de nginx intactas
envsubst '${API_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
