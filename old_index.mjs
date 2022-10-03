import { loadStdlib, ask } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib();

const isEmma = await ask.ask(
  `Are you Emma?`,
  ask.yesno
);

const who = isEmma ? 'Emma' : 'Lucas';

console.log(`Starting Morra Game as ${who}`);

let acc = null;

const createAcc = await ask.ask(
  `Would you like to create new account?`,
  ask.yesno
);

if(createAcc){
  acc = await stdlib.newTestAccount(stdlib.parseCurrency(1000));
} else {
  const secret = await ask.ask(
    `What is your account secret?`,
    (x => x)
  );
  acc = await stdlib.newAccountFromSecret(secret);
}

let ctc = null;

if (isEmma){
  ctc = acc.contract(backend);
  ctc.getInfo().then((info) => {
    console.log(`The contract is deployed = ${JSON.stringify(info)}`);
  });
} else {
  const info = await ask.ask(
    `Please paste the contract information`,
    JSON.parse
  );
  ctc = acc.contract(backend, info);
}

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBalance = async () => fmt(await stdlib.balanceOf(acc));

const before = await getBalance();
console.log(`Your balance is ${before}`);

const interact = { ...stdlib.hasRandom };

interact.informTimeout = () => {
  console.log(`There was a timeout`);
  process.exit(1);
};

if(isEmma) {
  const amount = await ask.ask(
    `How much do you want to wager?`,
    stdlib.parseCurrency
  );
  interact.wager = amount;
  interact.deadline = {ETH: 100, ALGO: 100, CFX: 1000}[stdlib.connector];

} else {
  interact.acceptWager = async (amount) => {
    const accepted = await ask.ask(
      `Do you accept the wager of ${fmt(amount)}`,
      ask.yesno
    );
    if(!accepted){
      process.exit(0);
    }
  };
}

const HAND = [0, 1, 2, 3, 4, 5];
const GUESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interact.getHand = async () => {
  const hand = await ask.ask(`What hand will you play (Choose 0-5) ?`);
  console.log(`You played ${hand}`);
  return hand;
};

interact.getGuess = async () => {
  const guess = await ask.ask(`What is your guess for the total number?`);
  console.log(`You guessed ${guess} total`);
  return guess;
};

interact.seeTotalNumber = (actualTotalNum)  => {
  console.log(`The actual total number is: ${actualTotalNum}`);
};

const OUTCOME = ['Emma wins!', 'Draw', 'Lucas wins!'];
interact.seeOutcome = (outcome) => {
  console.log(`The outcome is ${OUTCOME[outcome]}`);
};

const part = isEmma ? ctc.p.Emma : ctc.p.Lucas;
await part(interact);

const after = await getBalance();
console.log(`Your balance is now ${after}`);

ask.done();

console.log('Thank you for playing! Goodbye!!!');
