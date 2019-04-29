
# dev setup

Start rabbitmq like this:

```
docker run -p 5672:5672 -d --hostname my-rabbit --name some-rabbit rabbitmq:3
```

Tail logs:

```
docker logs -f some-rabbit
```

Start celery:

```
pipenv shell --fancy
celery -A tasks worker --loglevel=info # assumes tasks.py exists
```

Run a task:

```
from tasks import add
result = add.delay(4, 4)
# get task id:
result.task_id
result.ready() # is result ready
result.get(timeout=1) # get result
```

