# Cadence Samples
These are some samples to demostrate various capabilities of Cadence client and server.  You can learn more about cadence at:
* Cadence: https://github.com/uber/cadence
* Cadence Client: https://github.com/uber-go/cadence-client

## Prerequisite
Run Cadence Server

See instructions for running the Cadence Server: https://github.com/uber/cadence/blob/master/README.md

See instructions for using CLI to register a domain(name as "samples-domain"): https://cadenceworkflow.io/docs/08_cli
 or https://github.com/uber/cadence/blob/master/tools/cli/README.md 
 
 
## Steps to run samples
### Add NodeJS server URL to Go file

The Cadence workflow needs to know where it can find the NodeJS server. I highly recommend setting up a simple SSH tunnel, but the default NodeJS address is

http://localhost:4001

Once you know the address you want to use, you'll need to change `cmd/samples/recipes/pizzaactivity/pizza_activity_workflow.go`:

*line 174*
```go
// REPLACE ME WITH YOUR NodeJS server endpoint$
var baseUrl = "https://d0c3003f.ngrok.io"
```

### Build Samples
```
make
```

## Run Pizza Sample
### Start workers for pizzaactivity workflow and activities

```
./bin/pizzaactivity -m worker
```

### Start NodeJS server

**Note you must have the following environment variables defined to run the server**

If you need a Pusher account, it's free so do so [here](https://dashboard.pusher.com/accounts/sign_up)

```yaml
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
```

Assuming those are in your environment, run:

```bash
cd pizza-backend
npm install
npm build-ts
sudo npm run watch-node
```

> sudo is required to run the NodeJS process because it execs out to Docker. If your docker isn't installed as root, omit `sudo`

### Start the React frontend

**Note you must have the following environment variables defined to run the frontend**

```yaml
REACT_APP_PUSHER_ID
REACT_APP_PUSHER_CLUSTER
```

Assuming those are in your environment, run:

```bash
cd pizza-frontend
npm install
npm start
```

### Use the Pizza tracker

There are two pages for the tracking system, 1 for the customer and 1 for the worker.

**customer site**

http://localhost:3000/order


**worker site**

http://localhost:3000/make