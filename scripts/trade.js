const BN = require('bn.js');
const FlashloanArbitrage = artifacts.require('FlashloanArbitrage')
const utils = require('../scripts/Utils')

let arbFlashLoan, inTrade, config;

const divider = new BN('10000');
let multiplier, gasPrice, ownerBalance

module.exports = async (callback) => {

    // setup the db for the right blockchain
    let networkInfos = await utils.setup(web3)
    if(networkInfos === 'NONE') {
        console.log('The current blockchain network is not supported')
    }
    else {
        config = require(networkInfos.pathToDb)

        // get the balance of the currency used in the current blockchain
        ownerBalance = await web3.eth.getBalance(config.addresses[0].ownerMainnetAddress)

        // used for calculate if profit is higher than a certain amount
        multiplier = new BN((parseInt(config.tradeInfos[0].minBasisPoint) + 10000).toString());

        gasPrice = new BN(config.tradeInfos[0].gasPrice.toString())

        // load the contract
        arbFlashLoan = await FlashloanArbitrage.at(config.addresses[0].arbContract);

        await lookForTrade();
    }

    callback();
};

const lookForTrade = async () => {
    let tablePrint;
    let targetRoute;

    // search for trade by giving an arbitrary number of routers and tokens; is better that the number is lower than how many routers
    // you have saved in the db; otherwise there will be high chance that the swap will be executed through the same routers multiple times;
    targetRoute = searchForTrade(5)

    try {

        // continue just if your balance is higher than a certain treshold
        if (new BN(ownerBalance.toString()).gt(new BN(config.tradeInfos[0].treshold.toString()))) {

            // swap the amount corresponding at 10 dollar; it can be different; if u want to use a higher value, you must check first the reserve of the
            // tokens you are swapping through the routers;
            let tradeSize = utils.getAmountInDollar(targetRoute.tokens[0].address, 10, config.tokenPrices)

            let routers = utils.getTokenAddresses(targetRoute.routers)
            let tokens = utils.getTokenAddresses(targetRoute.tokens)

            // estimate the trade
            const profit = await arbFlashLoan.estimateTrade(tradeSize,
                routers, tokens)

            let routersAndTokensUsed = [...routers, ...tokens]

            // there are n routers and n tokens; the first n/2 element are the addresses of the routers and the remain the addresses of tokens
            tablePrint = {
                tradeSize: tradeSize.toString(),
                profit: profit.toString(),
                ...routersAndTokensUsed
            };

            console.table(tablePrint);

            // calculate if the profit is higher than a certain amount
            let sizeMultiplied = new BN(tradeSize.toString()).mul(new BN(multiplier.toString()));
            let profitTarget = sizeMultiplied.div(new BN(divider.toString()));

            if (new BN(profit.toString()).gt(profitTarget)) {
                await triTrade(tradeSize, targetRoute)
            } else {
                await lookForTrade();
            }
        }
    } catch (err) {
        await lookForTrade();
        console.log(err);
    }
};

/**
 * It calls the function 'triangularArbitrageWithFlashLoan(...)' of the contract to get the loan and execute the arbitrage.
 * @param amount the amount to borrow
 * @param targetRoute the object with the following form:
 *  routers: [{dex: str, address: str}, {dex: str, address: str}, ..., {dex: str, address: str}],
 *  tokens: [{symbol: str, address: str, decimals: str, id: str}, {symbol: str, address: str, decimals: str, id: str}, ..., {symbol: str, address: str, decimals: str, id: str}]
 * @returns {Promise<boolean>}
 */
const triTrade = async (amount, targetRoute) => {
    if (inTrade === true) {
        await lookForTrade();
        return false;
    }

    try {
        inTrade = true;
        console.log('> Making triTrade...');

        await utils.calculateGasPrice(gasPrice, 0, web3)

        let addresses = []

        for (let i = 0; i < targetRoute.routers.length; i++) {
            addresses = [...addresses, targetRoute.routers[i].address]
        }

        for (let i = 0; i < targetRoute.tokens.length; i++) {
            addresses = [...addresses, targetRoute.tokens[i].address]
        }

        const calldataParamsBytes = web3.eth.abi.encodeParameter('address[]', addresses);

        // execute the flashloan trade
        await arbFlashLoan.triangularArbitrageWithFlashLoan(calldataParamsBytes,
            targetRoute.tokens[0].address, amount, {gasPrice: gasPrice.toString()})

        inTrade = false;

        await lookForTrade()
    } catch (err) {
        console.log(err);
        inTrade = false;
        await utils.write(err, 'errorArbitrage.txt');
        await lookForTrade()
    }
};

/**
 * It create the targetRoute object that contains a list of routers and tokens. The targetRoute have the following fields:
 *  routers: [{dex: str, address: str}, {dex: str, address: str}, ..., {dex: str, address: str}],
 *  tokens: [{symbol: str, address: str, decimals: str, id: str}, {symbol: str, address: str, decimals: str, id: str}, ..., {symbol: str, address: str, decimals: str, id: str}]
 * @param n in how many routers you want to swap and with how many tokens
 * @returns {{tokens: *[], routers: *[]}}
 */
const searchForTrade = (n) => {

    let targetRoute = {
        routers: [],
        tokens: []
    }

    for (let i = 0; i < n; i++) {
        let router = config.routers[Math.floor(Math.random() * config.routers.length)];
        targetRoute.routers = [...targetRoute.routers, router]
    }

    for (let i = 0; i < n; i++) {
        if (i === 0) {
            let token = config.asset[Math.floor(Math.random() * config.asset.length)];
            targetRoute.tokens = [...targetRoute.tokens, token]
        } else {
            let token = config.token[Math.floor(Math.random() * config.token.length)];
            targetRoute.tokens = [...targetRoute.tokens, token]
        }
    }

    return targetRoute

}
