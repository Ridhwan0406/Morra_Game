import React from 'react';
import AppViews from './views/AppViews';
import DeployerViews from './views/DeployerViews';
import AttacherViews from './views/AttacherViews';
import {renderDOM, renderView} from './views/render';
import './index.css';
import * as backend from './build/index.main.mjs';
import { loadStdlib } from '@reach-sh/stdlib';
const reach = loadStdlib(process.env);

import { ALGO_MyAlgoConnect as MyAlgoConnect } from '@reach-sh/stdlib';
reach.setWalletFallback(reach.walletFallback({
  providerEnv: 'TestNet', MyAlgoConnect }));

const intToOutcome = ['Emma Wins!', 'Draw!', 'Lucas Wins!'];
const {standardUnit} = reach;
const defaults = {defaultFundAmt: '10', defaultWager: '2', standardUnit};

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {view: 'ConnectAccount', ...defaults};
    }
    async componentDidMount() {
        const acc = await reach.getDefaultAccount();
        const balAtomic = await reach.balanceOf(acc);
        const bal = reach.formatCurrency(balAtomic, 4);
        this.setState({acc, bal});
        if(await reach.canFundFromFaucet()){
            this.setState({view: 'FundAccount'});
        } else {
            this.setState({view: 'DeployerOrAttacher'});
        }
    }
    async fundAccount(fundAmount) {
        await reach.fundFromFaucet(this.state.acc, reach.parseCurrency(fundAmount));
        this.setState({view: 'DeployerOrAttacher'});
    }

    render() { return renderView(this, AppViews);}

    async skipFundAccount() {this.setState({view: 'DeployerOrAttacher'}); }
    selectAttacher() {this.setState({view: 'Wrapper', ContentView: Attacher});}
    selectDeployer() {this.setState({view: 'Wrapper', ContentView: Deployer});}
}

class Player extends React.Component {
    random() { return reach.hasRandom.random(); }
    async getHand() {
        const hand = await new Promise(resolveHandP => {
            this.setState({view: 'GetHand', playable: true, resolveHandP});
        });
        this.setState({view: 'WaitingForResults', hand});
        return hand;
    }
    async getGuess() {
        const guess = await new Promise(resolveGuessP => {
            this.setState({view: 'GetGuess', playable: true, resolveGuessP});
        });
        this.setState({view: 'WaitingForResults', guess});
        return guess;
    }
    seeOutcome(i) { this.setState({view: 'Done', outcome: intToOutcome[i]});}
    informTimeout() {this.setState({view: 'Timeout'}); }
    playHand(hand) { this.state.resolveHandP(hand); }
    playGuess(guess) { this.state.resolveGuessP(guess); }
}

class Deployer extends Player {
    constructor(props) {
        super(props);
        this.state = {view: 'SetWager'};
    }
    setWager(wager) {this.setState({view: 'Deploy', wager});}
    async deploy() {
        const ctc = this.props.acc.contract(backend);
        this.setState({view: 'Deploying', ctc});
        this.wager = reach.parseCurrency(this.state.wager);
        this.deadline = {ETH: 10, ALGO: 100, CFX: 1000}[reach.connector];
        backend.Emma(ctc, this);
        const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2);
        this.setState({view: 'WaitingForAttacher', ctcInfoStr});
    }
    render() { return renderView(this, DeployerViews); }
}

class Attacher extends Player {
    constructor(props) {
        super(props);
        this.state = {view: 'Attach'};
    }
    attach(ctcInfoStr) {
        const ctc = this.props.acc.contract(backend, JSON.parse(ctcInfoStr));
        this.setState({view: 'Attaching'});
        backend.Lucas(ctc, this);
    }
    async acceptWager(wagerAtomic){
        const wager = reach.formatCurrency(wagerAtomic, 4);
        return await new Promise(resolveAcceptedP => {
            this.setState({view: 'AcceptTerms', wager, resolveAcceptedP});
        });
    }
    termsAccepted() {
        this.state.resolveAcceptedP();
        this.setState({view: 'WaitingForTurn'});
    }
    render() { return renderView(this, AttacherViews);}
}
renderDOM(<App />);
