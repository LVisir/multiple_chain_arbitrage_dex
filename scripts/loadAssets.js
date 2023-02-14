const crudOp = require('./CRUDoperations')
const utils = require('./Utils')
const IPool = artifacts.require('IPool')
const WETH9 = artifacts.require('WETH9')

/**
 * Save the list of the tokens that can be borrow so the tokens used for the initial swap
 */
module.exports = async (callback) => {

    try {
        const networkInfos = await utils.setup(web3)
        if(networkInfos === 'NONE') {
            throw new Error('The current blockchain network is not supported')
        }

        const config = require(networkInfos.pathToDb)
        const poolInstance = await IPool.at(config.addresses[0].AAVEPoolV3)
        let token, decimals, symbol
        const tokenList = await poolInstance.getReservesList()

        for(let i = 0; i < tokenList.length; i++) {
            token = await WETH9.at(tokenList[i])
            decimals = await token.decimals()
            symbol = await token.symbol()
            let obj = {decimals: decimals.toString(), symbol, address: tokenList[i]}
            await crudOp.postMethod(networkInfos.urlToDb+'asset', obj)
        }

    }
    catch (e) {
        console.log(e)
    }

    callback()
}
