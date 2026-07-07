#!/bin/sh
set -eu

if [ -n "${BACKEND_UPSTREAM:-}" ]; then
  envsubst '${BACKEND_UPSTREAM}' < /etc/nginx/templates/compose.conf.template > /etc/nginx/conf.d/default.conf
else
  cp /etc/nginx/templates/k8s.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
