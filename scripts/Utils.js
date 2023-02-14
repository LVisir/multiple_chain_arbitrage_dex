const CONSTANT = require("./CONSTANT");
const {EvmChain} = require("@moralisweb3/common-evm-utils");
const fetch = require('node-fetch')
const Moralis = require('moralis').default;
const crudOp = require('../scripts/CRUDoperations')
const BigNumber = require("bignumber.js");
const BN = require("bn.js");
const fs = require("fs");

// from which network is connected it will return the proper data to connect to the db
const setup = async (web3) => {

    let networkId = await web3.eth.net.getId()

    switch (networkId) {
        case CONSTANT.BLOCKCHAINS_NETWORK.POLYGON:
            return {pathToDb: '../polygon.json', urlToDb: 'http://localhost:8001/'}
        case CONSTANT.BLOCKCHAINS_NETWORK.ETHEREUM:
            return {pathToDb: '../ethereum.json', urlToDb: 'http://localhost:8002/'}
        case CONSTANT.BLOCKCHAINS_NETWORK.FANTOM:
            return {pathToDb: '../fantom.json', urlToDb: 'http://localhost:8003/'}
        case CONSTANT.BLOCKCHAINS_NETWORK.AVALANCHE:
            return {pathToDb: '../avalanche.json', urlToDb: 'http://localhost:8004/'}
        case CONSTANT.BLOCKCHAINS_NETWORK.ARBITRUM:
            return {pathToDb: '../arbitrum.json', urlToDb: 'http://localhost:8005/'}
        case CONSTANT.BLOCKCHAINS_NETWORK.HARMONY:
            return {pathToDb: '../harmony.json', urlToDb: 'http://localhost:8006/'}
        case CONSTANT.BLOCKCHAINS_NETWORK.OPTIMISM:
            return {pathToDb: '../optimism.json', urlToDb: 'http://localhost:8007/'}
        default:
            return 'NONE'
    }

}

/**
 * From the 'tokenPrices' element in the db, it calculates how many tokens it is needed to reach the usd price.
 * @param address - The address of the token
 * @param price - The price in usd that you want to reach
 * @param tokenPrices - The list of tokens containing the price of the tokens
 * @returns {string}
 */
const getAmountInDollar = (address, price, tokenPrices) => {
    let prToken = 0
    let decimals = 0
    for (let i = 0; i < tokenPrices.length; i++) {
        if (address === tokenPrices[i].address) {
            prToken = tokenPrices[i].price
            decimals = tokenPrices[i].decimals
            break
        }
    }

    let ris = new BigNumber('0')

    let amtToken = new BigNumber(new BigNumber(price.toString()).dividedBy(new BigNumber(prToken.toString())))
    ris = amtToken.multipliedBy(10 ** decimals)

    return ris.integerValue().toFixed()

}

/**
 * It uses the Moralis API (check https://docs.moralis.io/web3-data-api/evm/how-to-get-the-price-of-an-erc20-token for more info) to fetch
 * the prices of the tokens. Read ReadMe for more info.
 * @param address - The address of the token
 * @param web3 - the web3js injected from Truffle
 * @returns {Promise<number>}
 */
const getPriceFromAddress = async (address, web3) => {

    let networkId = await web3.eth.net.getId()

    let chain

    switch (networkId) {
        case CONSTANT.BLOCKCHAINS_NETWORK.POLYGON:
            chain = EvmChain.POLYGON;
            break
        case CONSTANT.BLOCKCHAINS_NETWORK.ARBITRUM:
            chain = EvmChain.ARBITRUM;
            break
        case CONSTANT.BLOCKCHAINS_NETWORK.ETHEREUM:
            chain = EvmChain.ETHEREUM;
            break
        case CONSTANT.BLOCKCHAINS_NETWORK.AVALANCHE:
            chain = EvmChain.AVALANCHE;
            break
        case CONSTANT.BLOCKCHAINS_NETWORK.FANTOM:
            chain = EvmChain.FANTOM;
            break
        default:
            chain = 'NONE'
            break
    }

    if (chain !== 'NONE') {

        const response = await Moralis.EvmApi.token.getTokenPrice({
            address,
            chain,
        });

        return response.toJSON().usdPrice
    }
}

/**
 * For each token it save his price in the db
 * @param tokenList
 * @param web3 - The web3js injected from Truffle
 * @param urlToDb - the path to save the data in the db
 * @returns {Promise<void>}
 */
const savePrezziToken = async (tokenList, web3, urlToDb) => {

    let object = {
        address: '0x0',
        decimals: '',
        price: '0'
    }

    await Moralis.start({
        apiKey: "" + process.env.MORALIS_KEY,
    });

    for (let i = 0; i < tokenList.length; i++) {
        try {
            let price = await getPriceFromAddress(tokenList[i].address, web3)
            object.address = tokenList[i].address
            object.price = price.toString()
            object.decimals = tokenList[i].decimals
            await sleep(500)
            await crudOp.postMethod(urlToDb+'tokenPrices', object)
        } catch (e) {
            console.log('problem to save price of ' + tokenList[i].address)
            console.log(e)
        }
    }

}

/**
 * Simple function to make wait some seconds between the requests; with the free plan of Moralis API you can request more or less
 * just 20 request per seconds
 * @param ms
 * @returns {Promise<unknown>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert from list of object of type {address, symbol, decimals} to [address1, address2, ...]
 * @param tokens
 * @returns {*[]}
 */
const getTokenAddresses = (tokens) => {
    let ris = []
    for (let i = 0; i < tokens.length; i++) {
        ris = [...ris, tokens[i].address]
    }

    return ris
}

/**
 * It calculate the gas price for the ethereum or polygon network. It uses an API from https://docs.blocknative.com/gas-platform.
 * Read ReadMe for more infos. For other networks, update this function or use a static gas price value
 * @param gasPrice - The value to update
 * @param accuracy - From 0 to 4; the smaller the number, the higher the accuracy to guess the gas price
 * @param web3 - The web3js injected from Truffle
 * @returns {Promise<void>}
 */
const calculateGasPrice = async (gasPrice, accuracy, web3) => {
    try {

        if(accuracy > 4) return

        let networkId = await web3.eth.net.getId()

        let chainId = 'NONE'

        switch (networkId) {
            case CONSTANT.BLOCKCHAINS_NETWORK.POLYGON:
                chainId = networkId
                break
            case CONSTANT.BLOCKCHAINS_NETWORK.ETHEREUM:
                chainId = networkId
                break
            default:
                return
        }

        if(chainId === 'NONE') return

        await fetch(
            'https://api.blocknative.com/gasprices/blockprices?chainid='+chainId,
            {
                method: 'GET',
                headers: {
                    Authorization: ''+process.env.BLOCKNATIVE_KEY,
                },
            }
        ).then(async (ris) => {
            let data = await ris.json();
            gasPrice = new BN(data.blockPrices[0].estimatedPrices[accuracy].price.toString())
                .mul(new BN((10 ** 9).toString()))
                .toString();
        });
    } catch (err) {
        console.log(err)
    }
};

/**
 * Function to write in a file
 * @param array
 * @param path
 */
function write(array, path) {
    try {
        fs.writeFileSync(path, JSON.stringify(array));
    } catch (err) {
        console.log(err);
    }
}

/**
 * Transfer the token balance from the FlashLoanArbitrage contract to the owner
 * @param asset - List of token address
 * @param flArbitrage - Instance of the FlashLoanArbitrage contract
 * @returns {Promise<void>}
 */
const sendTokensFromContractToOwner = async (asset, flArbitrage) => {

    for(let i = 0; i < asset.length; i++) {
        await flArbitrage.recoverTokens(asset[i].address)
    }

}

module.exports = {
    setup,
    savePrezziToken,
    getAmountInDollar,
    getTokenAddresses,
    calculateGasPrice,
    write,
    sendTokensFromContractToOwner
}
