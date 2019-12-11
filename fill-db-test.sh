#!/bin/sh

cd "$(dirname "$0")"

psql < schema.sql
psql < test-data.sql
psql < test-cards.sql
