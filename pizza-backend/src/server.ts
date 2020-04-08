import express from 'express';
import Pusher from 'pusher';
import cors from 'cors';
import { spawn } from 'child_process';
import { join, resolve } from 'path';

const {
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
} = process.env;

const channelsClient = new Pusher({
  appId: PUSHER_APP_ID,
  key: PUSHER_KEY,
  secret: PUSHER_SECRET,
  cluster: PUSHER_CLUSTER,
  useTLS: false,
});

const userID = 'pizza';

export const sendCustomerData = (chan: string, data: any): void => {
  channelsClient.trigger('customer', 'customer', data);
}

export const sendWorkerData = (chan: string, data: any): void => {
  channelsClient.trigger('worker', 'worker', data);
}

const app = express();
app.use(cors());
let WFID: string;
let RUNID: string;

enum Signal {
  ORDERED = 'ORDERED',
  PREP = 'PREP',
  BAKE = 'BAKE',
  BOX = 'BOX',
  WAITING_FOR_DELIVERY = 'WAITING_FOR_DELIVERY',
  DELIVERY = 'DELIVERY',
  DONE = 'DONE',
}

const runCmd = (cmd: string, args: string[]) => {
  const fullPath = resolve(join(process.cwd(), '../cadence-samples'));
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: fullPath,
    });
    let wasErr = false;
    let stderrEnd = false;
    let stdoutEnd = false;
    const shouldResolve = () => {
      if (stdoutEnd && stderrEnd) {
        wasErr ? reject() : resolve();
      }
    };
    child.stdout.on('data', (buffer) => {
      process.stdout.write(buffer.toString());
    });
    child.stdout.on('end', () => {
      stdoutEnd = true;
      shouldResolve();
    });
    child.stderr.on('data', (buffer) => {
      process.stderr.write(buffer.toString());
      wasErr = buffer.toString() === '';
    });
    child.stderr.on('end', () => {
      stderrEnd = true;
      shouldResolve();
    });
  })
}

const triggerWorkflow = async () => {
  const cmd = './bin/pizzaactivity';
  try {
    await runCmd(cmd, ['-m', 'trigger']);
  } catch (err) {
    console.error(err);
  }
};

const sendSignal = async (wfID: string, runID: string, signal: Signal) => {
  const cmd = 'docker';
  try {
    await runCmd(cmd, [
      'run',
      '--network=host',
      '--rm',
      'ubercadence/cli:master',
      '--do',
      'samples-domain',
      'workflow',
      'signal',
      '-w',
      wfID,
      '-r',
      runID,
      '-n',
      'trigger-signal',
      '-i',
      JSON.stringify(signal),
    ]);
  } catch (err) {
    console.error(err);
  }
};

app.get('/trigger', async (req, res) => {
  await triggerWorkflow();
  console.log('triggered');
  res.status(200).send('ok');
});

app.post('/registerWorkflow', express.json(), async (req, res) => {
  const { ID, runID } = req.body;
  WFID = ID;
  RUNID = runID;
  console.log(`ID was ${ID}`);
  console.log(`runID was ${runID}`);
  // sendUserData('pizza', 'order received');
  sendCustomerData('customer', Signal.ORDERED);
  sendWorkerData('worker', Signal.ORDERED);
  res.sendStatus(200);
  console.log('worked');
});

const randInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

app.get('/driverAvailable', (req, res) => {
  const hunSidedDie = randInt(0, 100);
  console.log(`rolled delivery dice ${hunSidedDie}`);
  if (hunSidedDie > 70) {
    console.log(`driver is available`);
    return res.status(200).json({
      available: true,
    });
  }
  return res.status(200).json({
    available: false,
  });
});

app.post('/notify-user-of-delivery', async (req, res) => {
  console.log('Notify user of delivery');
  sendCustomerData('customer', Signal.DELIVERY);
  res.sendStatus(200);
});

app.post('/prep', express.json(), async (req, res) => {
  console.log('Notify user of prep');
  sendCustomerData('customer', Signal.PREP);
  res.sendStatus(200);
});

app.post('/bake', express.json(), async (req, res) => {
  console.log('Notify user of baking');
  sendCustomerData('customer', Signal.BAKE);
  res.sendStatus(200);
});

app.post('/box', express.json(), async (req, res) => {
  console.log('Notify user of boxing');
  sendCustomerData('customer', Signal.BOX);
  res.sendStatus(200);
});

app.post('/awaiting-delivery', express.json(), async (req, res) => {
  console.log('Notify user awaiting delivery');
  sendCustomerData('customer', Signal.WAITING_FOR_DELIVERY);
  res.sendStatus(200);
});

app.post('/done', express.json(), async (req, res) => {
  console.log('Notify user of done');
  sendCustomerData('customer', Signal.DONE);
  res.sendStatus(200);
});

app.post('/signalPhase', express.json(), async (req, res) => {
  const { phase } = req.body;
  if (WFID && RUNID) {
    console.log(`signaling phase ${phase}`);
    await sendSignal(WFID, RUNID, phase);
    return res.sendStatus(200);
  }
  return res.sendStatus(400);
});

app.listen(4001, () => console.log('Example app listening on port 3000!'));
