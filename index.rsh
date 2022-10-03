'reach 0.1';

const [isOutcome, A_WINS, DRAW, B_WINS] = makeEnum(3);
const winner = (handA, handB, guessA, guessB) => {

  if (guessA == guessB) {
    return DRAW;
  } else {
    if (guessA == (handA + handB)) {
      return A_WINS;
    } else {
      if (guessB == (handA + handB)) {
        return B_WINS;
      } else {
        return DRAW;
      }
    }
  }
};

assert(winner(4, 0, 4, 0) == A_WINS);
assert(winner(0, 4, 0, 4) == B_WINS);

assert(winner(0, 1, 0, 4) == DRAW);
assert(winner(5, 5, 5, 5) == DRAW);

forall(UInt, handA =>
  forall(UInt, handB =>
    forall(UInt, guessA =>
      forall(UInt, guessB =>
        assert(isOutcome(winner(handA, handB, guessA, guessB)))))));

forall(UInt, handA =>
  forall(UInt, handB =>
    forall(UInt, sameGuess =>
      assert(winner(handA, handB, sameGuess, sameGuess) == DRAW))));

const Player = {
  ...hasRandom, 
  getHand: Fun([], UInt),
  getGuess: Fun([UInt], UInt),
  seeTotalNumber: Fun([UInt], Null),    
  seeOutcome: Fun([UInt], Null),
  informTimeout: Fun([], Null),
};

export const main = Reach.App(() => {

  const Emma = Participant('Emma', {
    ...Player,
    wager: UInt,
    deadline: UInt,
  });

  const Lucas = Participant('Lucas', {
    ...Player,
    acceptWager: Fun([UInt], Null),
  });
  init();

  const informTimeout = () => {
    each([Emma, Lucas], () => {
      interact.informTimeout();
    });
  };

  Emma.only(() => {
    const wager = declassify(interact.wager);
    const deadline = declassify(interact.deadline);
  });

  Emma.publish(wager, deadline)
    .pay(wager);
  commit();

  Lucas.only(() => {
    interact.acceptWager(wager);
  });

  Lucas.pay(wager)
    .timeout(relativeTime(deadline), () => closeTo(Emma, informTimeout));

  var outcome = DRAW;
  invariant( balance() == 2 * wager && isOutcome(outcome));
  while ( outcome == DRAW ) {
    commit();

    Emma.only(() => {
      const _handA = interact.getHand();
      const _guessA = interact.getGuess(_handA);
      const [_commitA, _saltA] = makeCommitment(interact, _handA);
      const commitA = declassify(_commitA);
      const [_guessCommitA, _guessSaltA] = makeCommitment(interact, _guessA);
      const guessCommitA = declassify(_guessCommitA);
    });

    Emma.publish(commitA, guessCommitA)
      .timeout(relativeTime(deadline), () => closeTo(Lucas, informTimeout));
    commit();

    unknowable(Lucas, Emma(_handA, _saltA));
    unknowable(Lucas, Emma(_guessA, _guessSaltA));

    Lucas.only(() => {
      const _handB = interact.getHand();
      const _guessB = interact.getGuess(_handB);
      const handB = declassify(_handB);
      const guessB = declassify(_guessB);
    });

    Lucas.publish(handB, guessB)
      .timeout(relativeTime(deadline), () => closeTo(Emma, informTimeout));
    commit();

    Emma.only(() => {
      const [saltA, handA] = declassify([_saltA, _handA]);
      const [guessSaltA, guessA] = declassify([_guessSaltA, _guessA]);
    });

    Emma.publish(saltA, handA, guessSaltA, guessA)
      .timeout(relativeTime(deadline), () => closeTo(Lucas, informTimeout));
    checkCommitment(commitA, saltA, handA);
    checkCommitment(guessCommitA, guessSaltA, guessA);

    /* const actualTotalNum = handA + handB;

    each([Emma, Lucas], () => {
      interact.seeTotalNumber(actualTotalNum);
    });*/
    
    outcome = winner(handA, handB, guessA, guessB);
    continue;
  };

  assert(outcome == A_WINS || outcome == B_WINS);

  transfer(2 * wager).to(outcome == A_WINS ? Emma : Lucas);
  commit();

  each([Emma, Lucas], () => {
    interact.seeOutcome(outcome);
  });
  exit();
});