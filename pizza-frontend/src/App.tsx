import React, { useEffect, useState } from 'react';
import { Switch, Route } from 'react-router-dom';
import Pusher from 'pusher-js';
import './App.css';

import { PizzaPhase } from './PizzaPhases';
import { OrderPizza } from './OrderPizza';
import { MakePizza } from './MakePizza';

const {
  REACT_APP_PUSHER_ID,
  REACT_APP_PUSHER_CLUSTER,
} = process.env;

const pusher = new Pusher(REACT_APP_PUSHER_ID as string, {
  cluster: REACT_APP_PUSHER_CLUSTER,
  disableStats: true,
  pongTimeout: 30000000,
});

function App() {
  const [customerPhase, setCPhase] = useState<PizzaPhase>(PizzaPhase.NONE);
  const [employeePhase, setEPhase] = useState<PizzaPhase>(PizzaPhase.NONE);
  useEffect(() => {
    pusher.connection.bind('error', function(err: any) {
      if( err.error.data.code === 4004 ) {
        console.log('Over limit!');
      } else {
        console.log(err);
      }
    });
    const customerChannel = pusher.subscribe('customer');
    customerChannel.bind('customer', (data: any) => {
      console.log(`customer data of ${data}`);
      setCPhase(data);
    });
    const workerChannel = pusher.subscribe('worker');
    workerChannel.bind('worker', (data: any) => {
      console.log(`worker data of ${data}`);
      setEPhase(data);
    });
  }, []);

  return (
    <Switch>
      <Route
        path='/order'
        render={() =>
          <OrderPizza phase={customerPhase} setPhase={setCPhase}/>
        }
      />
      <Route
        path='/make'
        render={() =>
          <MakePizza employeePhase={employeePhase} setEPhase={setEPhase}/>
        }
      />
      <Route
        component={() => <div>Blank</div>}
      />
    </Switch>
  );
}

export default App;
