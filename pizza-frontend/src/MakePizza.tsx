import React, { MouseEvent, FC } from 'react';
import './App.css';
import { PizzaPhase } from './PizzaPhases';
import pizza from './pizza.png';

const backendURL = 'http://localhost:4001';

export interface OrderPizzaInterface {
  employeePhase: PizzaPhase;
  setEPhase: (phase: PizzaPhase) => void;
}

const phaseOrder: PizzaPhase[] = [
  PizzaPhase.NONE,
  PizzaPhase.ORDERED,
  PizzaPhase.PREP,
  PizzaPhase.BAKE,
  PizzaPhase.BOX,
  PizzaPhase.DELIVERY,
];

export const MakePizza: FC<OrderPizzaInterface> = ({
  employeePhase,
  setEPhase,
}) => {
  const nextPhase = phaseOrder.indexOf(employeePhase) + 1;
  const handleOrderProgress = async (evt: MouseEvent) => {
    evt.preventDefault();
    console.log(phaseOrder[nextPhase]);
    await fetch(`${backendURL}/signalPhase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phase: phaseOrder[nextPhase] }),
    });
    setEPhase(phaseOrder[nextPhase]);
  };
  if (employeePhase === PizzaPhase.NONE) {
    return (
      <div className="App">
        WORKER
        No Order currently placed
      </div>
    );
  }
  if (nextPhase >= phaseOrder.length) {
    setEPhase(PizzaPhase.NONE);
    return null;
  }
  return (
    <div className="App">
      Making customer pizza, currently {employeePhase}
      <img src={pizza} alt='pizza'/>
      <button style={{
        width: '80%',
        height: '50px',
      }} onClick={handleOrderProgress}>
          Progress to {phaseOrder[nextPhase]}
      </button>
    </div>
  );
};
