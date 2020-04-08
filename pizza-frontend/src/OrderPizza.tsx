import React, { MouseEvent, FC } from 'react';
import './App.css';
import { PizzaPhase } from './PizzaPhases';
import pizza from './pizza.png';

const backendURL = 'http://localhost:4001';

export interface OrderPizzaInterface {
  phase: PizzaPhase;
  setPhase: (phase: PizzaPhase) => void;
}

export const OrderPizza: FC<OrderPizzaInterface> = ({
  phase,
}) => {
  const handleOrderClick = async (evt: MouseEvent) => {
    evt.preventDefault();
    fetch(`${backendURL}/trigger`);
  };
  if (phase === PizzaPhase.NONE) {
    return (
      <div className="App">
        CUSTOMER
        <img src={pizza} alt='pizza'/>
        <button style={{
          width: '80%',
          height: '50px',
        }} onClick={handleOrderClick}>
            Place order
        </button>
      </div>
    );
  }
  if (phase === PizzaPhase.DONE) {
    return (
      <div className="App">
        CUSTOMER
        <img src={pizza} alt='pizza'/>
        <button style={{
          width: '80%',
          height: '50px',
        }} onClick={handleOrderClick}>
            Order another Pizza?
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      CUSTOMER
      Your pizza is being {phase}
    </div>
  );
};
