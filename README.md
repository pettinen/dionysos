# Dionysos

A drinking card game with a back-end implemented with Flask
and a front-end in Knockout.js. Those communicate via Socket.IO.

I'm developing on arch behind nginx+uwsgi+gevent. Flask's dev server
doesn't support WebSockets, so you'll have to do something similar.
(Swapping gevent for eventlet should work.)

Postgres and Redis databases are required.
Getting a virtualenv up and running should be pretty simple with pipenv.
I can't guarantee that any but the latest versions of the various
dependencies work.
At the very least you'll need Python 3.6 and Postgres 10.0.

Compability is not a priority. Rather, I'm using this project to learn about
some of the newest web technologies. Don't expect the site to work with
anything except the latest Firefox and Chrome.
