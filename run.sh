#!/bin/sh

cd "$(dirname "$0")"

pipenv run uwsgi --yaml uwsgi.yaml
