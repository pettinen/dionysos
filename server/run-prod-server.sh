#!/bin/sh

cd "$(dirname "$0")"

killall -u dionysos uwsgi 2>/dev/null
poetry run uwsgi --yaml uwsgi-prod.yaml
