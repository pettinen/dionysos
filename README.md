# Dionysos

A drinking card game with a back-end implemented with Flask
and a front-end in Knockout.js. Those communicate via Socket.IO.

I'm developing on arch behind nginx+uwsgi+gevent. Flask's dev server
doesn't support WebSockets, so you'll have to do something similar.
(Either the aforementioned setup, or something with eventlet.)

Postgres and Redis databases are required.

Getting a virtualenv up and running should be pretty simple with pipenv.
I'm using Python 3.8, though I guess >= 3.6 should work.
