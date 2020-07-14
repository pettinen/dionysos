#!/bin/sh

cd "$(dirname "$0")"

killall -u dionysos uwsgi 2>/dev/null
pipenv run uwsgi --daemonize /tmp/dionysos.log --yaml uwsgi.yaml
