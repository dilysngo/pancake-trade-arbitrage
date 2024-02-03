require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');

const Flashswap = require('./build/contracts/Flashswaptest.json');
const TransactionSender = require('./src/transaction_send');

const fs = require('fs');
const util = require('util');

var log_file = fs.createWriteStream(__dirname + '/log_arbitrage_test.txt', { flags: 'w' });
var log_stdout = process.stdout;
console.log = function (d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.BSC_TEST_HTTPS, {
        reconnect: {
            auto: true,
            delay: 5000, // ms
            maxAttempts: 15,
            onTimeout: false
        }
    })
);

const { testnet: addresses } = require('./addresses');
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_TEST_KEY);

const flashswap = new web3.eth.Contract(
    Flashswap.abi,
    Flashswap.networks[97].address
);

const BNB_TESTNET = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';
const BUSD_TESTNET = '0xFa60D973F7642B748046464e165A65B7323b0DEE'

const pair = {
    name: 'BNB to BUSD, pancake>pancake',
    amountTokenPay: 0.01,
    tokenPay: BNB_TESTNET,
    tokenSwap: BUSD_TESTNET,
    sourceRouter: addresses.pancake.router,
    targetRouter: addresses.pancake.router, // single router trade
    sourceFactory: addresses.pancake.factory,
}

const init = async () => {
    console.log('starting: ', pair.name);

    const transactionSender = TransactionSender.factory(process.env.BSC_TEST_HTTPS.split(','));

    let nonce = await web3.eth.getTransactionCount(admin);
    let gasPrice = await web3.eth.getGasPrice();
    let blocknumber = await web3.eth.getBlockNumber();
    console.log({ nonce, gasPrice, blocknumber });

    const owner = await flashswap.methods.owner().call();
    console.log(`started: wallet ${admin} - gasPrice ${gasPrice} - contract owner: ${owner}`);

    const check = await flashswap.methods.check(pair.tokenPay, pair.tokenSwap, new BigNumber(pair.amountTokenPay * 1e18), pair.sourceRouter, pair.targetRouter).call();
    console.log("check", check);

    const tx = flashswap.methods.start(
        blocknumber + process.env.BLOCKNUMBER,
        pair.tokenPay,
        pair.tokenSwap,
        new BigNumber(pair.amountTokenPay * 1e18),
        pair.sourceRouter,
        pair.targetRouter,
        pair.sourceFactory,
    );

    let estimateGas;
    try {
        estimateGas = await tx.estimateGas({from: admin});
    } catch (e) {
        console.error(`[${blocknumber}] [${new Date().toLocaleString()}]: [${pair.name}]`, 'gasCost error', e.message);
        return; 
    }

    const myGasPrice = new BigNumber(gasPrice).plus(gasPrice * 0.2212).toString();
    const txCostBNB = Web3.utils.toBN(estimateGas) * Web3.utils.toBN(myGasPrice);

    const data = tx.encodeABI();
    const txData = {
        from: admin,
        to: flashswap.options.address,
        data: data,
        gas: estimateGas,
        gasPrice: new BigNumber(myGasPrice),
        nonce: nonce
    };

    try {
        await transactionSender.sendTransaction(txData);
    } catch (e) {
        console.error('transaction error', e);
    }
}

init();   
