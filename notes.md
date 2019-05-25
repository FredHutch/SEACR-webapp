
# dev setup

Start rabbitmq like this:

```
docker run --rm -p 5672:5672 --hostname my-rabbit --name some-rabbit rabbitmq:3 && docker logs -f some-rabbit
```

Start celery:

```
pipenv shell --fancy
celery -A tasks worker --loglevel=info # assumes tasks.py exists
```

Run a task:

```python
from tasks import add
result = add.delay(4, 4)
# get task id:
result.task_id
result.ready() # is result ready
result.get(timeout=1) # get result, if ready
```

Specifically, run a SEACR task:

```python
from tasks import *
result = run_seacr.delay("/some/temp/dir", "/path/to/SEACR_1.0.sh",  "NPATBH.spike_Ec.bedgraph",
        "IgGBH.spike_Ec.bedgraph",
        None,
        "norm",
        "AUC",
        "SH_Hs_NPATBH.spike_Ec_IgGBH.spike_Ec")
```

To get states from a running task:

```python
prevstate = None
while not result.ready():
    if result.info != prevstate:
        print(f'State={result.state}, info={result.info}')
        prevstate = result.info
    time.sleep(1)

print(f'State={result.state}, info={result.info}')
```
