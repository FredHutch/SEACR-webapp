# SEACR-webapp

A web application that wraps the
[SEACR](https://github.com/FredHutch/SEACR) method.

## Architecture

### Components

Back end:

* [Flask](http://flask.pocoo.org) - Python web application framework

* [Celery](http://www.celeryproject.org) - distributed task queue
* [RabbitMQ](https://www.rabbitmq.com) - message broker

Front end:

* [jQuery](https://jquery.com) - Javascript library
* [Bootstrap](https://getbootstrap.com) - front-end component library
* [jQuery File Upload](https://github.com/blueimp/jQuery-File-Upload) - file upload widget

### Functionality

* Form to upload data file and optional control file, and enter
  various parameters to SEACR method.
* When form is submitted, files are uploaded and SEACR job is started as an asynchonous
  Celery task. Front end polls server for job status updates and
  updates console in UI. 
* When task is complete, links appear for downloading output file(s).

### Development dependencies & setup

* [Python 3.6](https://www.python.org/downloads/release/python-368/)
* [RabbitMQ](https://hub.docker.com/_/rabbitmq) - Recommend using [Docker container](https://hub.docker.com/_/rabbitmq).
* [Pipenv](https://pipenv.readthedocs.io/en/latest/) - used to manage dependencies - install with `pip3 install pipenv`. After cloning repository, install project dependencies as follows:

```
pipenv install # install project dependencies
pipenv install -d # install development dependencies
```

* Before each development session, activate project virtual
  environment with `pipenv shell`. 
* In a separate window, start the RabbitMQ Docker container:

```
docker run --rm -p 5672:5672 --hostname my-rabbit --name some-rabbit rabbitmq:3 && docker logs -f some-rabbit
```

* In another separate window, start the Celery tasks:

```
pipenv shell
celery -A tasks worker --loglevel=info
```

* Start web app in development mode with `python app.py`. App
  will be available at [http://localhost:5000](http://localhost:5000).

